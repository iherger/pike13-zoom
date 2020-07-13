import * as cron from "node-cron";
import axios from "axios";
import moment from "moment-timezone";
import { v4 } from "uuid";

const config = {
  pike: {
    accessToken: process.env.PIKE_ACCESS_TOKEN,
    baseUrl: process.env.PIKE_BASE_URL,
    serviceIds: process.env.PIKE_SERVICE_IDS,
  },
  jitsi: {
    baseUrl: process.env.JITSI_BASE_URL,
  },
  users: process.env.USER_IDS?.split(";").map((user) => {
    const details = user.split(",");
    return {
      name: details[0],
    };
  }),
};

const pike = axios.create({
  baseURL: config.pike.baseUrl,
  headers: {
    Authorization: `Bearer ${config.pike.accessToken}`,
    "Content-Type": "application/json",
  },
});

// main
cron.schedule("*/5 * * * *", async () => {
  // (async () => {
  console.log("\nStarting cron job...");

  // get pike13 events
  const eventsResponse = await pike.get("/event_occurrences", {
    params: {
      from: moment().format(),
      to: moment().add(24, "hours").format(),
      service_ids: config.pike.serviceIds,
    },
  });
  const events = eventsResponse.data.event_occurrences;
  console.log(`--Found ${events.length} events within the next 24 hours`);

  // loop through upcoming pike13
  for (let event of events) {
    const singleEventResult = await pike.get(`/event_occurrences/${event.id}`);
    const singleEvent = singleEventResult.data.event_occurrences[0];

    // check if notice needs to be sent out
    const now = moment();
    const timeDifference = moment(event.start_at).diff(now, "minutes");

    if (timeDifference <= 30 && singleEvent.state === "active") {
      // check if note with link exists (load all notes for event occurrence, )
      const existingNotesResult = await pike.get(
        `/event_occurrences/${event.id}/notes`
      );
      const existingNotes = existingNotesResult.data.notes;

      if (!existingNotes.length) {
        const url = `${config.jitsi.baseUrl}/Iyengar-Yoga-Zug-${v4()}`;

        const note = `Der Link für ${event.name} heute um ${moment(
          event.start_at
        )
          .tz(event.timezone)
          .format(
            "HH:mm"
          )} Uhr lautet:<br /><a href="${url}" target="_blank">${url}</a>`;

        await pike.post(`/event_occurrences/${event.id}/notes`, {
          note: {
            note,
            public: true,
            send_notifications: true,
          },
          send_notifications: true,
        });
        console.log(`----Created notification with meeting URL ${url}.`);
      } else {
        console.log("----Notification already exists. Skipping.");
      }
    } else if (timeDifference <= 30 && singleEvent.state === "canceled") {
      console.log("----Event canceled. Skipping notification.");
    } else {
      console.log(
        `----Too early for notification (${timeDifference} minutes).`
      );
    }
  }

  console.log("Finished cron job!");

  //
  // })();
});
