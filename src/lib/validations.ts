import { z } from "zod";

// ─── PRODUCT ──────────────────────────────────────────────────────────────────

export const CreateProductSchema = z.object({
  name:        z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  category:    z.string().min(1, "Category is required"),
  brand:       z.string().min(1, "Brand is required"),
  sku:         z.string().min(1, "SKU is required"),
  price:       z.number().positive("Price must be positive"),
  costPrice:   z.number().positive().optional(),
  stock:       z.number().int().min(0).default(0),
  lowStockAt:  z.number().int().min(0).default(10),
  imageUrl:    z.string().url().optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

// ─── SERVICE ──────────────────────────────────────────────────────────────────

export const CreateServiceSchema = z.object({
  name:          z.string().min(1).max(200),
  description:   z.string().optional(),
  category:      z.string().min(1),
  price:         z.number().positive(),
  discountPrice: z.number().positive().optional(),
  duration:      z.number().int().positive("Duration must be positive (minutes)"),
  isPopular:     z.boolean().default(false),
  staffIds:      z.array(z.string()).optional(),
  imageUrl:      z.string().url().optional(),
});

export const UpdateServiceSchema = CreateServiceSchema.partial();

// ─── CLIENT ───────────────────────────────────────────────────────────────────

export const CreateClientSchema = z.object({
  name:        z.string().min(1).max(200),
  email:       z.string().email("Invalid email"),
  phone:       z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  address:     z.string().optional(),
  notes:       z.string().optional(),
});

export const UpdateClientSchema = CreateClientSchema.partial();

// ─── STAFF ────────────────────────────────────────────────────────────────────

export const StaffRoleEnum = z.enum([
  "ADMIN", "SENIOR_STYLIST", "STYLIST", "ESTHETICIAN", "NAIL_TECHNICIAN", "RECEPTIONIST",
]);

export const CreateStaffSchema = z.object({
  name:       z.string().min(1).max(200),
  email:      z.string().email(),
  phone:      z.string().optional(),
  role:       StaffRoleEnum.default("STYLIST"),
  bio:        z.string().optional(),
  imageUrl:   z.string().url().optional(),
  serviceIds: z.array(z.string()).optional(),
  password:   z.string().min(8, "Password must be at least 8 characters"),
});

export const UpdateStaffSchema = CreateStaffSchema.omit({ password: true }).partial().merge(
  z.object({ password: z.string().min(8).optional() })
);

// ─── APPOINTMENT ──────────────────────────────────────────────────────────────

export const AppointmentStatusEnum = z.enum([
  "PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW",
]);

export const CreateAppointmentSchema = z.object({
  clientId:  z.string().min(1),
  serviceId: z.string().min(1),
  staffId:   z.string().min(1),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  notes:     z.string().optional(),
  price:     z.number().positive(),
});

export const UpdateAppointmentSchema = CreateAppointmentSchema.partial().merge(
  z.object({ status: AppointmentStatusEnum.optional() })
);

// ─── TRANSACTION ──────────────────────────────────────────────────────────────

export const PaymentMethodEnum = z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER"]);

export const TransactionItemSchema = z.object({
  productId: z.string().optional(),
  serviceId: z.string().optional(),
  name:      z.string().min(1),
  unitPrice: z.number().positive(),
  quantity:  z.number().int().positive(),
}).refine(d => d.productId || d.serviceId, {
  message: "Each item must reference a product or service",
});

export const CreateTransactionSchema = z.object({
  clientId:       z.string().optional(),
  items:          z.array(TransactionItemSchema).min(1, "Cart cannot be empty"),
  discountPct:    z.number().min(0).max(100).default(0),
  paymentMethod:  PaymentMethodEnum.default("CASH"),
  appointmentIds: z.array(z.string()).optional(),
  notes:          z.string().optional(),
});

// ─── QUERY PARAMS ─────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const DateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to:   z.string().datetime().optional(),
});
