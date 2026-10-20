import ListEditor from "@/components/lists/ListEditor";

export default async function EditListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListEditor listId={id} />;
}