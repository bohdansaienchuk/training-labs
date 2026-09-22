"use client";

import type { RefObject } from "react";
import { ActionList } from "@/components/action-list";

export function WorkoutExerciseMenu({ selected, first, last, anchor, exerciseList, onAction, onClose }: {
  selected: boolean;
  first: boolean;
  last: boolean;
  anchor: RefObject<HTMLButtonElement | null>;
  exerciseList: RefObject<HTMLUListElement | null>;
  onAction: (action: "delete" | "up" | "down") => void;
  onClose: () => void;
}) {
  return <ActionList id="workout-exercise-actions" label="Дії з вправою" anchor={anchor} selectionList={exerciseList}
    selectionSelector="[data-workout-exercise-select]" onAction={onAction} onClose={onClose} items={[
      { action: "delete", label: "Видалити вправу", icon: "/icons/workout-details/delete.svg", disabled: !selected },
      { action: "up", label: "Підняти вгору", icon: "/icons/workout-details/up.svg", disabled: !selected || first },
      { action: "down", label: "Опустити вниз", icon: "/icons/workout-details/down.svg", disabled: !selected || last },
    ]} />;
}
