import { sql } from "@vercel/postgres";
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from "./definitions";
import { formatCurrency } from "./utils";
import prisma from "./db";

export async function fetchRevenue() {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log("Fetching revenue data...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const revenue = await prisma.revenue.findMany({
      select: {
        month: true,
        revenue: true,
      },
    });

    console.log("Data fetch completed after 3 seconds.");

    return revenue;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

export async function fetchLatestInvoices() {
  try {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const invoices = await prisma.invoices.findMany({
      select: {
        amount: true,
        id: true,
        customer: {
          select: {
            name: true,
            imageUrl: true,
            email: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: 5,
    });

    const latestInvoices = invoices.map((invoice) => ({
      ...invoice,
      ...invoice.customer,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the latest invoices.");
  }
}

export async function fetchCardData() {
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const invoiceCountPromise = prisma.invoices.count();
    const customerCountPromise = prisma.customers.count();
    const invoiceStatusPromise = prisma.invoices.groupBy({
      by: ["status"],
      _sum: {
        amount: true,
      },
    });

    const [numberOfInvoices, numberOfCustomers, invoiceStatus] =
      await prisma.$transaction([
        invoiceCountPromise,
        customerCountPromise,
        invoiceStatusPromise,
      ]);

    type Acc = { paid: string; pending: string };

    const { paid: totalPaidInvoices, pending: totalPendingInvoices } =
      invoiceStatus.reduce((acc, val) => {
        acc[val.status as keyof Acc] = formatCurrency(val._sum.amount ?? 0);
        return acc;
      }, {} as Acc);

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch card data.");
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await prisma.invoices.findMany({
      where: {
        OR: [
          { customer: { name: { contains: query } } },
          { customer: { email: { contains: query } } },
          { status: { contains: query } },
        ],
      },
      include: {
        customer: { select: { email: true, imageUrl: true, name: true } },
      },
      orderBy: { date: "desc" },
      skip: offset,
      take: ITEMS_PER_PAGE,
    });

    return invoices.map((invoice) => ({ ...invoice, ...invoice.customer }));
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const count = await prisma.invoices.count({
      where: {
        OR: [
          { customer: { name: { contains: query } } },
          { customer: { email: { contains: query } } },
          { status: { contains: query } },
        ],
      },
    });

    const totalPages = Math.ceil(Number(count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await prisma.invoices.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        customerId: true,
        amount: true,
        status: true,
      },
    });

    const invoice = {
      ...data,
      amount: data.amount / 100,
    };

    return invoice;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoice.");
  }
}

export async function fetchCustomers() {
  try {
    const customers = await prisma.customers.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });
    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch customer table.");
  }
}
