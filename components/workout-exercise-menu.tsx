"use client";

import type { RefObject } from "react";
import { ActionList } from "@/components/action-list";

export function WorkoutExerciseMenu({ selected, first, last, busy = false, menuId = "workout-exercise-actions", selectionSelector = "[data-workout-exercise-select]", anchor, exerciseList, onAction, onClose }: {
  selected: boolean;
  first: boolean;
  last: boolean;
  busy?: boolean;
  menuId?: string;
  selectionSelector?: string;
  anchor: RefObject<HTMLButtonElement | null>;
  exerciseList: RefObject<HTMLElement | null>;
  onAction: (action: "delete" | "up" | "down") => void;
  onClose: () => void;
}) {
  return <ActionList id={menuId} label="Дії з вправою" anchor={anchor} selectionList={exerciseList}
    selectionSelector={selectionSelector} onAction={onAction} onClose={onClose} items={[
      { action: "delete", label: "Видалити вправу", icon: "/icons/workout-details/delete.svg", disabled: !selected || busy },
      { action: "up", label: "Підняти вгору", icon: "/icons/workout-details/up.svg", disabled: !selected || first || busy },
      { action: "down", label: "Опустити вниз", icon: "/icons/workout-details/down.svg", disabled: !selected || last || busy },
    ]} />;
}
