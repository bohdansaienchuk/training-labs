"use client";

import Image from "next/image";
import { useId } from "react";
import { SetAction } from "@/components/workout-controls";
import { WeightUnitSelect } from "@/components/weight-unit-select";
import { convertWeight, countLabel, validatePerformedSet, type ActivePerformedSet, type ActiveSessionExercise } from "@/lib/active-workout";
import { WEIGHT_UNIT_LABELS } from "@/lib/weight-unit";

const columns = ["Підхід", "Вага", "Од", "Повтори", "Запас"];

function PreviousResults({ exercise }: { exercise: ActiveSessionExercise }) {
  return (
    <div className="flex flex-col items-center gap-2 overflow-hidden rounded-12 bg-primary-300 p-2 text-[#000000]">
      <h3 className="type-caption w-full whitespace-nowrap text-center">Результати попереднього тренування</h3>
      {exercise.previousSets.length === 0 ? (
        <p className="type-caption py-1 text-center">Немає попередніх результатів</p>
      ) : (
        <div role="table" aria-label="Результати попереднього тренування" className="flex w-full flex-col items-center gap-2 font-body text-[10px] leading-4 font-normal text-center">
          <div role="row" className="grid w-full grid-cols-5 gap-2 rounded-8 bg-primary-100 text-neutral-900">
            {columns.map((label) => <span role="columnheader" key={label}>{label}</span>)}
          </div>
          {exercise.previousSets.map((set) => (
            <div role="row" key={set.setNumber} className="grid h-5 w-[calc(100%+16px)] grid-cols-5 items-center gap-2 rounded-12 bg-primary-100">
              {[set.setNumber, set.weight ?? "—", WEIGHT_UNIT_LABELS[set.weightUnit], set.reps ?? "—", set.rir ?? "—"].map((value, index) => <span role="cell" key={index}>{value}</span>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CurrentSetRow({ set, validate, saveError, onChange }: {
  set: ActivePerformedSet;
  validate: boolean;
  saveError: boolean;
  onChange: (set: ActivePerformedSet, immediate?: boolean) => void;
}) {
  const validation = validatePerformedSet(set);
  const invalidRow = validate && !validation.valid;
  const inputClass = (valid: boolean) => `type-body-l [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none h-10 w-full min-w-0 rounded-8 border bg-neutral-50 px-2 text-center text-[#000000] focus-visible:outline-2 focus-visible:outline-offset-2 ${validate && !valid ? "border-error focus-visible:outline-error" : "border-primary-500 focus-visible:outline-primary-500"}`;
  return (
    <div className="flex flex-col gap-1" data-performed-set={set.id}>
      <div role="row" className="grid h-10 grid-cols-5 items-center gap-2">
        <span role="cell" className="type-body-m text-center">{set.setNumber}</span>
        <div role="cell" className="min-w-0">
          <input aria-label={`Вага, підхід ${set.setNumber}`} aria-invalid={validate && !validation.weight} type="number" min="0" step="any" inputMode="decimal"
            value={set.weight ?? ""} onChange={(event) => onChange({ ...set, weight: Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber })}
            className={inputClass(validation.weight)} />
        </div>
        <div role="cell" className="min-w-0">
          <WeightUnitSelect label={`Од, підхід ${set.setNumber}`} value={set.weightUnit} onChange={(weightUnit) => onChange({
            ...set,
            weight: set.weight === null ? null : convertWeight(set.weight, set.weightUnit, weightUnit),
            weightUnit,
          }, true)} />
        </div>
        <div role="cell" className="min-w-0">
          <input aria-label={`Повтори, підхід ${set.setNumber}`} aria-invalid={validate && !validation.reps} type="number" min="0" step="1" inputMode="numeric"
            value={set.reps ?? ""} onChange={(event) => onChange({ ...set, reps: Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber })}
            className={inputClass(validation.reps)} />
        </div>
        <div role="cell" className="min-w-0">
          <input aria-label={`Запас, підхід ${set.setNumber}`} aria-invalid={validate && !validation.rir} type="text" inputMode="numeric"
            value={set.rir} onChange={(event) => onChange({ ...set, rir: event.target.value })}
            className={inputClass(validation.rir)} />
        </div>
      </div>
      {invalidRow && <p role="alert" className="type-caption pl-[calc(20%+8px)] text-error">Заповніть всі клітинки</p>}
      {saveError && <p role="alert" className="type-caption pl-[calc(20%+8px)] text-error">Не вдалося зберегти зміни</p>}
    </div>
  );
}

export function ActiveExerciseCard({ exercise, validate, saveErrors, mutating, menuOpen, onMenuToggle, onSetChange, onAddSet, onRemoveSet }: {
  exercise: ActiveSessionExercise;
  validate: boolean;
  saveErrors: ReadonlySet<string>;
  mutating: boolean;
  menuOpen: boolean;
  onMenuToggle: (exerciseId: string, trigger: HTMLButtonElement) => void;
  onSetChange: (exerciseId: string, set: ActivePerformedSet, immediate?: boolean) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
}) {
  const titleId = useId();
  return (
    <article aria-labelledby={titleId} className="flex w-full shrink-0 flex-col gap-3 rounded-12 bg-neutral-900 p-4 text-neutral-50">
      <header className="flex items-center gap-2">
        <h2 id={titleId} className="type-heading-m min-w-0 flex-1">{exercise.name}</h2>
        <button type="button" data-active-exercise-menu-trigger aria-label={`Дії з вправою ${exercise.name}`} aria-haspopup="menu" aria-expanded={menuOpen}
          aria-controls={menuOpen ? "active-exercise-actions" : undefined} onClick={(event) => onMenuToggle(exercise.id, event.currentTarget)}
          className="flex size-6 shrink-0 items-center justify-center rounded-8 focus-visible:outline-2 focus-visible:outline-primary-500">
          <Image src="/icons/workout-details/ellipsis.svg" alt="" width={4} height={18} unoptimized />
        </button>
      </header>
      <p data-active-set-count className="type-body-m -mt-2 text-[#ffffff]">{countLabel(exercise.sets.length, ["підхід", "підходи", "підходів"])}</p>
      <PreviousResults exercise={exercise} />
      <div role="table" aria-label={`Поточні підходи: ${exercise.name}`} className="flex flex-col gap-2">
        <div role="row" className="type-body-m grid grid-cols-5 gap-2 text-center">
          {columns.map((label) => <span role="columnheader" key={label}>{label}</span>)}
        </div>
        {exercise.sets.map((set) => <CurrentSetRow key={set.id} set={set} validate={validate} saveError={saveErrors.has(set.id)} onChange={(updated, immediate) => onSetChange(exercise.id, updated, immediate)} />)}
      </div>
      <div className="flex gap-3">
        <SetAction icon="plus" disabled={mutating} onClick={() => onAddSet(exercise.id)}>Додати підхід</SetAction>
        <SetAction icon="minus" disabled={mutating || exercise.sets.length <= 1} onClick={() => onRemoveSet(exercise.id, exercise.sets.at(-1)!.id)}>Видалити підхід</SetAction>
      </div>
    </article>
  );
}
