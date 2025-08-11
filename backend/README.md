# Backend Setup and Configuration

## Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password
JWT_SECRET=your_jwt_secret_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

- `EMAIL_USER` and `EMAIL_PASS`: Used for sending 2FA codes via Gmail SMTP. You must use an [App Password](https://support.google.com/accounts/answer/185833?hl=en) if 2FA is enabled on your Gmail account.
- `JWT_SECRET`: Any random string, used to sign JWT tokens for authentication.
- `VITE_GOOGLE_CLIENT_ID`: Only needed if using Google OAuth login.

## 2FA and JWT Authentication Flow

1. **Login:**
   - User submits email and password to `/api/auth/login`.
   - If credentials are valid, a 6-digit 2FA code is generated and sent to the user's email.
   - The response includes the user ID (no JWT yet).
2. **2FA Verification:**
   - User submits the received code and user ID to `/api/auth/verify-2fa`.
   - If the code is valid and not expired, a JWT is issued in the response.
3. **Accessing Protected Routes:**
   - Include the JWT in the `Authorization` header as `Bearer <token>` to access protected endpoints (e.g., `/api/protected`).

## Example: Protected Route

A sample protected route is available at `/api/protected`. You must include a valid JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

## Testing Email 2FA
- Use a real Gmail account and generate an App Password for `EMAIL_PASS`.
- Check your email inbox for the 2FA code after login.

## Notes
- 2FA is **mandatory** for all users.
- JWT tokens expire after 1 hour by default.
- All sensitive configuration should be kept in your `.env` file (never commit real secrets to version control). 