import bcrypt from "bcrypt";
import prisma from "../lib/db";
import { customers, invoices, revenue, users } from "../lib/placeholder-data";

async function seedUsers() {
  const convertedUsers = await Promise.all(
    users.map(async (user) => ({
      name: user.name,
      email: user.email,
      password: await bcrypt.hash(user.password, 10),
    }))
  );

  const createdUsers = await prisma.users.createManyAndReturn({
    data: convertedUsers,
  });

  return createdUsers;
}

async function seedInvoices() {
  const insertedInvoices = await prisma.invoices.createManyAndReturn({
    data: invoices.map((invoice) => ({
      customerId: invoice.customer_id,
      amount: invoice.amount,
      status: invoice.status,
      date: new Date(invoice.date),
    })),
  });

  return insertedInvoices;
}

async function seedCustomers() {
  const insertedCustomers = await prisma.customers.createManyAndReturn({
    data: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      imageUrl: customer.image_url,
    })),
  });

  return insertedCustomers;
}

async function seedRevenue() {
  const insertedRevenue = await prisma.$transaction(
    revenue.map((r) =>
      prisma.revenue.create({
        data: {
          month: r.month,
          revenue: r.revenue,
        },
      })
    )
  );

  return insertedRevenue;
}

export async function GET() {
  try {
    const users = await seedUsers();
    const revenue = await seedRevenue();
    const customers = await seedCustomers();
    const invoices = await seedInvoices();
    return Response.json({
      message: "Database seeded successfully",
      customers,
      invoices,
      users,
      revenue,
    });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
