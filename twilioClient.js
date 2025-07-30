import { Twilio } from "twilio";

const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error("Twilio environment variables are not set");
}

const twilioClient = new Twilio(
  accountSid,
  authToken
);


export default twilioClient;
