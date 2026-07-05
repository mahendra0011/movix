import { z } from "zod";

const emailField = z.string().email("Invalid email address.").max(320);
const passwordField = z.string().min(6, "Password must be at least 6 characters.").max(128);
const nameField = z.string().trim().min(1, "Name is required.").max(100);
const otpField = z.string().length(6, "OTP must be 6 digits.");

const registerSchema = z.object({
  body: z.object({
    name: nameField,
    email: emailField,
    password: passwordField,
    role: z.enum(["user", "theater-owner"]).optional().default("user"),
    ownerApplication: z.any().optional(),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

const loginSchema = z.object({
  body: z.object({
    email: emailField,
    password: z.string().min(1, "Password is required."),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailField,
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

const otpSchema = z.object({
  body: z.object({
    email: emailField,
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

const resetPasswordSchema = z.object({
  body: z.object({
    email: emailField,
    otp: otpField,
    password: passwordField,
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

const ticketOtpSchema = z.object({
  body: z.object({
    email: emailField,
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

const verifyTicketOtpSchema = z.object({
  body: z.object({
    email: emailField,
    otp: otpField,
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

const bookingSchema = z.object({
  body: z.object({
    showId: z.string().min(1, "showId is required."),
    movieId: z.string().min(1, "movieId is required."),
    movie: z.string().min(1, "movie is required."),
    theaterId: z.string().optional(),
    theater: z.string().min(1, "theater is required."),
    screen: z.string().optional(),
    time: z.string().min(1, "time is required."),
    seats: z.array(z.string()).min(1, "At least one seat is required."),
    total: z.number().positive("Total must be positive."),
    email: emailField,
    emailVerificationToken: z.string().optional(),
    holdToken: z.string().optional(),
    paymentId: z.string().optional(),
    paymentProvider: z.string().optional(),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

function createValidator(schema) {
  return (request, response, next) => {
    const result = schema.safeParse({
      body: request.body,
      query: request.query,
      params: request.params,
    });

    if (!result.success) {
      const firstError = result.error.errors[0];
      response.status(400).json({
        error: firstError?.message || "Validation failed.",
        field: firstError?.path?.join("."),
        requestId: request.id,
      });
      return;
    }

    request.body = result.data.body;
    request.query = result.data.query;
    request.params = result.data.params;
    next();
  };
}

export {
  bookingSchema,
  createValidator,
  forgotPasswordSchema,
  loginSchema,
  otpSchema,
  registerSchema,
  resetPasswordSchema,
  ticketOtpSchema,
  verifyTicketOtpSchema,
};
