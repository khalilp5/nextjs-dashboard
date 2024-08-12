import Form from "@/app/ui/invoices/edit-form";
import Breadcrumbs from "@/app/ui/invoices/breadcrumbs";
import { fetchCustomers, fetchInvoiceById } from "@/app/lib/data";
import { notFound } from "next/navigation";
import { Metadata, ResolvingMetadata } from "next";
import prisma from "@/app/lib/db";

type Props = {
  params: { id: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id;
  const invoice = await prisma.invoices.findUnique({
    where: { id: id },
    select: {
      amount: true,
      customer: { select: { name: true } },
    },
  });

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `${invoice?.customer.name} - Edit Invoice`,
    openGraph: {
      images: [...previousImages],
    },
  };
}

export default async function Page({ params: { id } }: Props) {
  const invoice = await fetchInvoiceById(id);
  const customers = await fetchCustomers();

  if (!invoice) {
    notFound();
  }
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: "Invoices", href: "/dashboard/invoices" },
          {
            label: "Edit Invoice",
            href: `/dashboard/invoices/${id}/edit`,
            active: true,
          },
        ]}
      />
      <Form invoice={invoice} customers={customers} />
    </main>
  );
}
