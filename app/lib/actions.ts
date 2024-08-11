"use server";

import { z } from "zod";
import prisma from "./db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: "Please select a customer",
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: "Please enter an amount greater than $0" }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Please select a status",
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export const createInvoice = async (
  prevState: State,
  data: FormData
): Promise<State> => {
  const {
    success,
    data: parsedData,
    error,
  } = CreateInvoice.safeParse({
    customerId: data.get("customerId"),
    amount: data.get("amount"),
    status: data.get("status"),
  });

  if (!success) {
    return {
      errors: error.flatten().fieldErrors,
      message: "Missing required fields. Failed to create invoice",
    };
  }

  const { amount, customerId, status } = parsedData;
  try {
    const amountInCents = amount * 100;
    await prisma.invoices.create({
      data: {
        amount: amountInCents,
        date: new Date(),
        customerId: customerId,
        status,
      },
    });
  } catch (error) {
    return {
      errors: {},
      message: "Database Error: Failed to Create Invoice.",
    };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
};

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData
): Promise<State> {
  const { success, data, error } = UpdateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  if (!success) {
    return {
      errors: error.flatten().fieldErrors,
      message: "Missing required fields. Failed to create invoice",
    };
  }
  const { amount, customerId, status } = data;

  const amountInCents = amount * 100;

  try {
    await prisma.invoices.update({
      where: { id },
      data: {
        customerId,
        amount: amountInCents,
        status: status,
      },
    });
  } catch (error) {
    return {
      message: "Database Error: Failed to Update Invoice.",
    };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  try {
    await prisma.invoices.delete({ where: { id: id } });
    revalidatePath("/dashboard/invoices");
    return { message: "Deleted Invoice." };
  } catch (error) {
    return {
      message: "Database Error: Failed to Delete Invoice.",
    };
  }
}

export const authenticate = async (
  prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> => {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
};
