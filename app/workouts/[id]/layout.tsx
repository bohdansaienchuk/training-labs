import { WorkoutDraftProvider } from "@/components/workout-draft-provider";

export default async function WorkoutLayout({ children, params }: LayoutProps<"/workouts/[id]">) {
  const { id } = await params;
  return <WorkoutDraftProvider key={id}>{children}</WorkoutDraftProvider>;
}
