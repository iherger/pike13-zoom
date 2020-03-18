import * as cron from "node-cron";
import axios from "axios";
import moment from "moment";

const config = {
  pike: {
    accessToken: process.env.PIKE_ACCESS_TOKEN,
    baseUrl: process.env.PIKE_BASE_URL,
    serviceIds: process.env.PIKE_SERVICE_IDS
  },
  zoom: {
    baseUrl: process.env.ZOOM_BASE_URL,
    jwt: process.env.ZOOM_JWT
  },
  users: process.env.USER_IDS?.split(";").map(user => {
    const details = user.split(",");
    return { name: details[0], pike: details[1], zoom: details[2] };
  })
};

const randomIntFromInterval = (min: number, max: number) => {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const pike = axios.create({
  baseURL: config.pike.baseUrl,
  headers: {
    Authorization: `Bearer ${config.pike.accessToken}`,
    "Content-Type": "application/json"
  }
});

const zoom = axios.create({
  baseURL: config.zoom.baseUrl,
  headers: { Authorization: `Bearer ${config.zoom.jwt}` }
});

// main
(async () => {
  console.log(config.users);

  // get pike13 events
  const events = await pike.get("/event_occurrences", {
    params: {
      from: moment().format("YYYY-MM-DD"),
      to: moment()
        .add(5, "days")
        .format("YYYY-MM-DD"),
      service_ids: config.pike.serviceIds
    }
  });

  const eventList = events.data.event_occurrences;
  console.log(eventList);

  const note = await pike.post(
    `/event_occurrences/${eventList?.[0].id}/notes`,
    {
      note: {
        note: "The URL for the Online class is https://something.or.other",
        public: true,
        send_notifications: true
      },
      send_notifications: true
    }
  );
  console.log(note.data);

  // also send note to teacher

  const singleEvent = await pike.get(`/event_occurrences/${eventList?.[0].id}`);
  console.log(singleEvent.data);

  // get zoom users
  const users = await zoom.get("/users");
  console.log(users.data);
  // match zoom users with event instructors (maybe)

  // check if pike13 meetings have already been scheduled

  // if pike13 meeting is

  //   create meeting
  //   const createOptions = {
  //     topic: eventList?.[0].name,
  //     password: randomIntFromInterval(10000, 999999),
  //     type: 2,
  //     start_time: eventList?.[0].start_at,
  //     timezone: eventList?.[0].timezone,
  //     duration: 90,
  //     agenda: `pike13Id:${eventList?.[0].id}`,
  //     tracking_fields: [{ field: "pike13Id", value: eventList?.[0].id }]
  //   };
  //   console.log(createOptions);

  //   const createMeeting = await zoom.post(
  //     `/users/${config.users?.[0].zoom}/meetings`,
  //     createOptions
  //   );
  //   console.log(createMeeting.data);

  // check if meeting already exists for

  //

  // get zoom meetings
  const meetings = await zoom.get("/users/me/meetings", {
    params: { type: "upcoming" }
  });
  console.log(meetings.data);

  //
})();

cron.schedule("* * * * *", () => {
  console.log("Another minute has passed");
});
