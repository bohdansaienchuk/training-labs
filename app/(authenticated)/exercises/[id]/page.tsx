import { ExerciseDetailsView } from "@/components/exercise-details-view";
import { requireUser } from "@/lib/current-user";
import { getExerciseDetailsForUser } from "@/lib/get-exercise-details";

export default async function ExerciseDetails({ params }: PageProps<"/exercises/[id]">) {
  const { id } = await params;
  const currentUser = await requireUser();
  const details = await getExerciseDetailsForUser(id, currentUser.id);
  return <ExerciseDetailsView details={details} />;
}
