import EmbeddedList from "@/components/lists/EmbeddedList";

export default async function EmbeddedListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmbeddedList listId={id} />;
}