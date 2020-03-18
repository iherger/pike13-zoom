import * as cron from "node-cron";
import axios from "axios";
import moment from "moment";

const config = {
  pike13: {
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

// cron.schedule("* * * * *", () => {
(async () => {
  console.log(config.users);

  const pike13 = axios.create({
    baseURL: config.pike13.baseUrl,
    headers: { Authorization: `Bearer ${config.pike13.accessToken}` }
  });

  const zoom = axios.create({
    baseURL: config.zoom.baseUrl,
    headers: { Authorization: `Bearer ${config.zoom.jwt}` }
  });

  // get events
  const events = await pike13.get("/event_occurrences", {
    params: {
      from: moment().format("YYYY-MM-DD"),
      to: moment()
        .add(5, "days")
        .format("YYYY-MM-DD"),
      service_ids: config.pike13.serviceIds
    }
  });

  const eventList = events.data.event_occurrences;
  console.log(eventList);

  // get zoom users
  const users = await zoom.get("/users");
  console.log(users.data);

  // match zoom users with event instructors

  //   create meeting
  const createOptions = {
    topic: "Online Yoga",
    password: randomIntFromInterval(10000, 999999),
    type: 2,
    start_time: eventList?.[0].start_at,
    timezone: eventList?.[0].timezone,
    duration: 90,
    agenda: `ID:${eventList?.[0].id}`
  };
  console.log(createOptions);

  const createMeeting = await zoom.post(
    `/users/${config.users?.[0].zoom}/meetings`,
    createOptions
  );
  console.log(createMeeting.data);

  // get zoom meetings
  const meetings = await zoom.get("/users/me/meetings");
  console.log(meetings.data);

  // check if meeting already exists for

  //

  //
})();
// });
