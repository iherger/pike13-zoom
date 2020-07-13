// get list of activities
// curl -X POST https://api.myclubs.com/api-partners/v1/parse/ActivityDate -H "x-session: r:3193ede39cb3274f198f4ad4792042a4" -d '{"where":{"activity":{"__type":"Pointer","objectId":"ODZ9gvWeHp","className":"Activity"},"start":{"$gte":{"__type":"Date","iso":"2020-03-02T07:02:02.919Z"}},"status":{"$in":["active","draft"]}},"options":{"limit":5000,"order":"start","include":"activity"}}' -H 'Content-Type: application/json'

// notify
// curl -X POST https://api.myclubs.com/api/v1/live/activityDates/fZGiZdy0n1/notify -H "x-session: r:3193ede39cb3274f198f4ad4792042a4" -d '{"livestreamUrl":"https://zoom.us/j/98765","livestreamDescription":""}' -H 'Content-Type: application/json'
