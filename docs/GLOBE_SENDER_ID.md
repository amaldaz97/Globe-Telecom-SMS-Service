# Obtaining Your M360 Sender ID (shortcode_mask)

Use this guide when you see:

> `The shortcode_mask is not provisioned.`

## What this means

Your API integration is working. M360 rejected the request because `M360_SENDER_ID` in `.env` is not registered on your Globe Business account for the `app_key` you are using.

## Where to get the correct value

1. Log in to the **Globe M360 / Globe Business portal**
2. Open your **App** or **API** settings (the app matching your `M360_APP_KEY`)
3. Find **Sender ID**, **Masking name**, or **shortcode_mask**
4. Confirm status is **active / approved**
5. Copy the value **exactly** (case-sensitive, no spaces)

If you cannot find it, contact your **Globe Business account manager** or M360 support.

## Questions to ask Globe/M360 support

1. What is the **provisioned `shortcode_mask`** for our account?
2. Is it **linked to our `app_key`**?
3. Is the sender ID **approved for broadcast SMS**?
4. Do we need an **alphanumeric mask** or a **numeric shortcode**?
5. Is our **SMS credit balance** sufficient?

## After you receive the sender ID

1. Edit `.env`:
   ```env
   M360_SENDER_ID=YOUR_PROVISIONED_VALUE
   ```
2. Restart the server:
   ```bash
   npm run build && npm start
   ```
3. Retry `POST /api/sms/send`

## Common formats

- Alphanumeric brand mask: `SUNMOBILITY`, `SUNMOB`
- Numeric shortcode (per your contract): varies by account

The value must match what Globe provisioned — not a test or placeholder name.
