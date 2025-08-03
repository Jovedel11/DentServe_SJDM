
export const canRequestOtp = (identifier, otpCooldown) => {
  const now = Date.now();
  const lastRequest = otpCooldown[identifier];
  const coolDownPeriod = 6000;

  if (!lastRequest) return true;

  const timeLeft = coolDownPeriod - (now - lastRequest);
  return timeLeft <= 0;
}

export const getOtpCooldownTime = (identifier, otpCooldown) => {
  const now = Date.now();
  const lastRequest = otpCooldown[identifier];
  const coolDownPeriod = 6000;

  if (!lastRequest) return 0;

  const timeLeft = coolDownPeriod - (now - lastRequest);
  return Math.max(0, Math.ceil(timeLeft / 1000));
}