import { ExerciseDetailsView } from "@/components/exercise-details-view";
import { getExerciseDetails } from "@/lib/get-exercise-details";

export default async function ExerciseDetails({ params }: PageProps<"/exercises/[id]">) {
  const { id } = await params;
  const details = await getExerciseDetails(id);
  return <ExerciseDetailsView details={details} />;
}
