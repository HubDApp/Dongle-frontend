import ListDetail from "@/components/lists/ListDetail";

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListDetail listId={id} />;
}