import * as cron from "node-cron";
import axios from "axios";
import moment from "moment-timezone";

interface ZoomMeeting {
  uuid: string;
  id: number;
  host_id: string;
  topic: string;
  type: number;
  start_time: Date;
  duration: number;
  timezone: string;
  created_at: Date;
  join_url: string;
}

const config = {
  pike: {
    accessToken: process.env.PIKE_ACCESS_TOKEN,
    baseUrl: process.env.PIKE_BASE_URL,
    serviceIds: process.env.PIKE_SERVICE_IDS,
  },
  zoom: {
    baseUrl: process.env.ZOOM_BASE_URL,
    jwt: process.env.ZOOM_JWT,
  },
  users: process.env.USER_IDS?.split(";").map((user) => {
    const details = user.split(",");
    return {
      name: details[0],
      pike: parseInt(details[1], 10),
      zoom: details[2],
    };
  }),
};

const randomIntFromInterval = (min: number, max: number) => {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const pike = axios.create({
  baseURL: config.pike.baseUrl,
  headers: {
    Authorization: `Bearer ${config.pike.accessToken}`,
    "Content-Type": "application/json",
  },
});

const zoom = axios.create({
  baseURL: config.zoom.baseUrl,
  headers: { Authorization: `Bearer ${config.zoom.jwt}` },
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

  // get zoom meetings
  const meetingsResponse = await zoom.get("/users/me/meetings", {
    params: { type: "upcoming" },
  });
  const meetings = meetingsResponse.data.meetings as ZoomMeeting[];

  // loop through upcoming pike13
  for (let event of events) {
    const singleEventResult = await pike.get(`/event_occurrences/${event.id}`);
    const singleEvent = singleEventResult.data.event_occurrences[0];

    const staff = config.users?.find(
      (user) => user.pike === singleEvent.staff_members[0].id
    );

    // check if zoom meeting already exists
    const singleZoomMeeting = meetings.find(
      (meeting) =>
        meeting.start_time === event.start_at && meeting.topic === event.name
    );

    let url = singleZoomMeeting?.join_url;

    if (!singleZoomMeeting) {
      // create new zoom meeting
      const createOptions = {
        topic: event.name,
        password: randomIntFromInterval(10000, 999999),
        type: 2,
        start_time: event.start_at,
        timezone: event.timezone,
        duration: 90,
        agenda: `pike13Id:${event.id}`,
        tracking_fields: [{ field: "pike13Id", value: event.id }],
        settings: {
          alternative_hosts: staff?.zoom,
        },
      };

      const createMeeting = await zoom.post(
        `/users/${config.users?.[0].zoom}/meetings`,
        createOptions
      );
      url = createMeeting.data.join_url;

      console.log(
        `----Created meeting at ${moment(event.start_at)
          .tz(event.timezone)
          .format("YYYY-MM-DD HH:mm")}`
      );
    } else {
      console.log(
        `----Meeting at ${moment(event.start_at)
          .tz(event.timezone)
          .format("YYYY-MM-DD HH:mm")} already exists`
      );
    }

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
