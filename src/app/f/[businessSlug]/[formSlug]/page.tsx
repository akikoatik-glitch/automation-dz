import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import PublicForm from '@/components/PublicForm';

export const dynamic = 'force-dynamic';

export default async function PublicFormPage({ params }: { params: { businessSlug: string; formSlug: string } }) {
  const business = await prisma.business.findUnique({ where: { slug: params.businessSlug } });
  if (!business || business.status !== 'active') notFound();

  const form = await prisma.webForm.findFirst({
    where: { businessId: business.id, slug: params.formSlug }
  });
  if (!form || !form.enabled) notFound();

  let fields = [];
  try {
    fields = JSON.parse(form.fields) || [];
  } catch {
    fields = [];
  }

  return (
    <main dir={business.lang === 'ar' ? 'rtl' : 'ltr'} lang={business.lang} className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 pb-16">
      <PublicForm
        businessName={business.name}
        formName={form.name}
        description={null}
        slug={`${params.businessSlug}/${params.formSlug}`}
        fields={fields}
      />
      <p className="mt-8 text-center text-[11px] text-slate-400">Propulsé par Wassil</p>
    </main>
  );
}