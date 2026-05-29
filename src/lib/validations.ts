import { z } from "zod";

// ─── PRODUCT ──────────────────────────────────────────────────────────────────

export const CreateProductSchema = z.object({
  name:        z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  category:    z.array(z.string()).min(1, "At least one category is required"),
  brand:       z.string().min(1, "Brand is required"),
  sku:         z.string().min(1, "SKU is required"),
  price:       z.number().min(0, "Price cannot be negative"),
  costPrice:   z.number().min(0, "Cost price cannot be negative").optional(),
  salePriceTaxType:      z.string().optional().default("WITH_TAX"),
  salePriceDiscount:     z.number().min(0).optional().default(0),
  salePriceDiscountType: z.string().optional().default("PERCENTAGE"),
  purchasePriceTaxType:  z.string().optional().default("WITH_TAX"),
  wholesalePrice:        z.number().min(0).optional(),
  wholesalePriceTaxType: z.string().optional().default("WITH_TAX"),
  taxRate:               z.number().min(0).max(100).optional().default(5),
  stock:       z.number().int().min(0).default(0),
  lowStockAt:  z.number().int().min(0).default(2),
  imageUrl:    z.string().url().optional().nullable().or(z.literal("")),
});

export const UpdateProductSchema = CreateProductSchema.partial();

// ─── SERVICE ──────────────────────────────────────────────────────────────────

export const CreateServiceSchema = z.object({
  name:          z.string().min(1).max(200),
  description:   z.string().optional(),
  category:      z.string().min(1),
  price:         z.number().min(0, "Price cannot be negative"),
  discountPrice: z.number().min(0, "Discount price cannot be negative").optional(),
  isPopular:     z.boolean().default(false),
  staffIds:      z.array(z.string()).optional(),
  imageUrl:      z.string().url().optional(),
});

export const UpdateServiceSchema = CreateServiceSchema.partial();

// ─── CLIENT ───────────────────────────────────────────────────────────────────

export const CreateClientSchema = z.object({
  name:        z.string().min(1).max(200),
  email:       z.string().email("Invalid email"),
  phone:       z.string().regex(/^\+(\d{1,4})\s?\d{10}$/, "Phone number must be strictly 10 digits prefixed with a country code (by default +91 for India)").nullable().optional().or(z.literal("")),
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
  phone:      z.string().regex(/^\+(\d{1,4})\s?\d{10}$/, "Phone number must be strictly 10 digits prefixed with a country code (by default +91 for India)").nullable().optional().or(z.literal("")),
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
  "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW",
]);

export const PaymentMethodEnum = z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER"]);

const CreateAppointmentBaseSchema = z.object({
  clientId:   z.string().min(1),
  serviceId:  z.string().min(1).optional(),
  serviceIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
  staffId:    z.string().min(1),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  startTime:  z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal("")]).optional(),
  endTime:    z.string().regex(/^\d{2}:\d{2}$/, "End time must be HH:MM").optional().or(z.literal("")),
  notes:      z.string().optional(),
  price:      z.number().min(0, "Price cannot be negative"),
  deleteAppointmentIds: z.array(z.string()).optional(),
  status:     AppointmentStatusEnum.optional(),
  taxPct:      z.number().optional(),
  discountPct: z.number().optional(),
  paymentMethod: PaymentMethodEnum.optional().default("CASH"),
});

export const CreateAppointmentSchema = CreateAppointmentBaseSchema.refine(
  data => data.serviceId || (data.serviceIds && data.serviceIds.length > 0) || (data.productIds && data.productIds.length > 0),
  {
    message: "Either serviceId, serviceIds, or productIds must be provided",
    path: ["serviceId"],
  }
).refine(
  data => !!(data.startTime || data.endTime),
  {
    message: "Either startTime or endTime must be provided",
    path: ["startTime"],
  }
);

export const UpdateAppointmentSchema = CreateAppointmentBaseSchema.partial().merge(
  z.object({ status: AppointmentStatusEnum.optional() })
);

// ─── TRANSACTION ──────────────────────────────────────────────────────────────

export const TransactionItemSchema = z.object({
  productId: z.string().optional(),
  serviceId: z.string().optional(),
  name:      z.string().min(1),
  unitPrice: z.number().min(0, "Price cannot be negative"),
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

// ─── EXPENSE ──────────────────────────────────────────────────────────────────

export const CreateExpenseSchema = z.object({
  title:    z.string().min(1, "Title is required").max(200),
  amount:   z.number().positive("Amount must be positive"),
  category: z.enum(["PRODUCT_PURCHASE", "STAFF_PAYMENT", "INFRASTRUCTURE", "MISCELLANEOUS"]),
  type:     z.enum(["BILL", "PAYMENT_OUT", "MISC"]),
  date:     z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  notes:    z.string().optional(),
});

