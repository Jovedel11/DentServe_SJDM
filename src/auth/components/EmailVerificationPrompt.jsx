const EmailVerificationPrompt = ({ email }) => {
  return (
    <div style={{ maxWidth: "500px", margin: "50px auto", padding: "20px" }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h2 style={{ color: "#007bff", marginBottom: "10px" }}>
          📧 Email Verification Required
        </h2>
        <p style={{ fontSize: "16px", color: "#495057" }}>
          We've sent a verification link to:
        </p>
        <p
          style={{
            fontWeight: "bold",
            color: "#007bff",
            fontSize: "18px",
            padding: "10px",
            backgroundColor: "#e7f3ff",
            borderRadius: "4px",
            margin: "10px 0",
          }}
        >
          {email}
        </p>
      </div>

      <div style={{ margin: "20px 0", textAlign: "center" }}>
        <a
          href="https://gmail.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            backgroundColor: "#dc3545",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
            margin: "5px 10px",
            fontSize: "16px",
          }}
        >
          📧 Open Gmail
        </a>

        <a
          href="https://outlook.live.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            backgroundColor: "#0078d4",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
            margin: "5px 10px",
            fontSize: "16px",
          }}
        >
          📧 Open Outlook
        </a>
      </div>

      <div
        style={{
          padding: "20px",
          backgroundColor: "#e8f5e8",
          borderRadius: "8px",
          border: "1px solid #4caf50",
        }}
      >
        <h4 style={{ margin: "0 0 15px 0", color: "#2e7d32" }}>
          ✅ What happens next:
        </h4>
        <ol style={{ margin: "0", paddingLeft: "20px", color: "#2e7d32" }}>
          <li style={{ marginBottom: "8px" }}>
            Check your email inbox (and spam folder)
          </li>
          <li style={{ marginBottom: "8px" }}>
            Click the "Confirm your email" link
          </li>
          <li style={{ marginBottom: "8px" }}>
            Your phone <strong>({email.split("@")[0]}'s phone)</strong> will be
            automatically verified
          </li>
          <li style={{ marginBottom: "0" }}>
            You'll be redirected to your patient dashboard
          </li>
        </ol>
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#fff3cd",
          borderRadius: "4px",
          border: "1px solid #ffc107",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#856404" }}>
          🔍 Can't find the email?
        </h4>
        <ul style={{ margin: "0", paddingLeft: "20px", color: "#856404" }}>
          <li>Check your spam/junk folder</li>
          <li>Wait a few minutes and refresh your inbox</li>
          <li>Make sure you entered the correct email address</li>
        </ul>
      </div>
    </div>
  );
};

export default EmailVerificationPrompt;
