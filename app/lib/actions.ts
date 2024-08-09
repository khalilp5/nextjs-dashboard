"use server";

import { z } from "zod";
import prisma from "./db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export const createInvoice = async (data: FormData) => {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: data.get("customerId"),
    amount: data.get("amount"),
    status: data.get("status"),
  });
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
      message: "Database Error: Failed to Create Invoice.",
    };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
};

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

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
  throw new Error("Failed to delete invoice");
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
