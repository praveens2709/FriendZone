# Free hosting guide

Services: Render (API), MongoDB Atlas (database), Cloudinary (images), email (see below).

## Staying awake

Render's free web service sleeps after 15 minutes without traffic. To keep it awake, create a free monitor at uptimerobot.com that requests `https://<your-service>.onrender.com/health` every 5 minutes. 750 free hours a month covers one service all month.

Other always-on free options and their costs:
- Google Cloud e2-micro VM: always on, but only in three US regions (about 250 ms away from India), needs a card, and includes only 1 GB of outbound data a month.
- Oracle Cloud: reduced in 2026 to 2 CPUs and 12 GB, signup is often rejected, and idle servers can be reclaimed.

## One-time setup

1. **Atlas.** Network Access, Add IP Address, Allow access from anywhere (0.0.0.0/0).
2. **Email.** Pick one (Render's free tier blocks Gmail's normal SMTP ports):
   - **Dedicated Gmail account over the Gmail API (free, no domain).** Create a new Gmail account for the app (not your personal one). In Google Cloud Console create a project, enable the Gmail API, set up the OAuth consent screen (External, add the new account as a test user, then Publish app so the token does not expire after 7 days), and create an OAuth client of type Desktop app. Then run:
     `GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node friendzone-backend/scripts/gmail-token.mjs`
     and follow the link. Put `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` and `EMAIL_FROM` (the new Gmail address) in your `.env` and in Render.
   - **Your own domain with Brevo (free plan, needs a domain, about a dollar or a few hundred rupees a year).** Brevo cannot authenticate gmail.com senders, so a branded address like `noreply@yourdomain` needs the domain verified in Brevo. Put `BREVO_API_KEY` and `EMAIL_FROM` in `.env` and Render.
3. **Render.** New, Blueprint, connect this GitHub repo. It reads `render.yaml` (Singapore region). Paste the secret values from your local `friendzone-backend/.env` when prompted. Set `PUBLIC_BASE_URL` to the service URL after the first deploy.
4. Open `https://<your-service>.onrender.com/health`. It should show `{"status":"ok"}`.

## Pointing the app at it

```
cd friendzone-frontend
FZ_API_URL=https://<your-service>.onrender.com/api/ bash scripts/dev.sh
```

Metro still runs on your Mac, so phones need to reach it for the JavaScript bundle until you make a standalone build.

## Limits to remember

- No persistent disk on Render's free tier. Images already live on Cloudinary.
- Free services can be restarted by Render at any time.
