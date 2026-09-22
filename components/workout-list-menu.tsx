"use client";

import type { RefObject } from "react";
import { ActionList } from "@/components/action-list";

export type WorkoutListAction = "edit" | "up" | "down" | "delete";

export function WorkoutListMenu({ selected, first, last, deleting, anchor, workoutList, onAction, onClose }: {
  selected: boolean;
  first: boolean;
  last: boolean;
  deleting: boolean;
  anchor: RefObject<HTMLButtonElement | null>;
  workoutList: RefObject<HTMLUListElement | null>;
  onAction: (action: WorkoutListAction) => void;
  onClose: () => void;
}) {
  return <ActionList id="workout-list-actions" label="Дії з тренуванням" anchor={anchor} selectionList={workoutList}
    selectionSelector="[data-workout-select]" onAction={onAction} onClose={onClose} items={[
      { action: "edit", label: "Редагувати тренування", icon: "/icons/workout-details/edit.svg", disabled: !selected || deleting },
      { action: "up", label: "Перемістити вгору", icon: "/icons/workout-details/up.svg", disabled: !selected || first || deleting },
      { action: "down", label: "Перемістити вниз", icon: "/icons/workout-details/down.svg", disabled: !selected || last || deleting },
      { action: "delete", label: "Видалити тренування", icon: "/icons/workout-details/delete.svg", disabled: !selected || deleting },
    ]} />;
}
