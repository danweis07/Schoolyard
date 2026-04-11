# Fundraising example

The fundraising module is configured entirely through `school.config.json` —
there is no content collection to seed. When a school enables this module,
the Hub (or setup wizard) should fill in the `fundraising` block:

```json
{
  "fundraising": {
    "provider": "paypal",
    "donateUrl": "https://www.paypal.com/donate/?hosted_button_id=YOUR_BUTTON_ID",
    "annualGoal": 25000,
    "currentRaised": 0,
    "goalLabel": "Annual Fund"
  }
}
```

Pick a provider (`paypal`, `stripe`, or `other`), paste in your donation URL,
set a goal, and the donate page renders automatically. Update `currentRaised`
whenever you reconcile the books — this is a manual number in v1; live tracking
is on the roadmap.
