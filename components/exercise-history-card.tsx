type HistorySet = {
  number: number;
  weight: number;
  unit: string;
  reps: number;
  reserve: number;
};

type ExerciseHistoryCardProps = {
  date: string;
  dateTime: string;
  workoutName: string;
  sets: readonly HistorySet[];
};

export function ExerciseHistoryCard({ date, dateTime, workoutName, sets }: ExerciseHistoryCardProps) {
  return (
    <article aria-label={`${date}, ${workoutName}`} className="type-body-l flex w-full shrink-0 flex-col gap-4 overflow-hidden rounded-12 bg-neutral-900 py-3 text-center text-[#ffffff]">
      <header className="flex items-center gap-4">
        <time dateTime={dateTime} className="min-w-0 flex-1">{date}</time>
        <h3 className="min-w-0 flex-1">{workoutName}</h3>
      </header>
      <div role="table" aria-label={`Підходи за ${date}`} className="flex flex-col gap-2 px-2">
        <div role="row" className="grid h-11 grid-cols-5 gap-1">
          {["Підхід", "Вага", "Од", "Повтори", "Запас"].map((label) => (
            <span role="columnheader" key={label} className="flex min-w-0 items-center justify-center whitespace-nowrap">{label}</span>
          ))}
        </div>
        {sets.map(({ number, weight, unit, reps, reserve }) => (
          <div role="row" key={number} className="grid h-11 grid-cols-5 gap-1">
            <span role="cell" className="flex items-center justify-center">{number}</span>
            {[weight, unit, reps, reserve].map((value, index) => (
              <span role="cell" key={index} className="flex min-w-0 items-center justify-center rounded-8 bg-primary-100 text-neutral-950">{value}</span>
            ))}
          </div>
        ))}
      </div>
    </article>
  );
}
