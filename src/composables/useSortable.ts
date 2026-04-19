import { ref, computed, onUnmounted, type Ref } from "vue";

export interface SortableOptions {
  onReorder: (orderedIds: string[]) => void;
}

export function useSortable(
  containerRef: Ref<HTMLElement | null>,
  itemIds: Ref<string[]>,
  options: SortableOptions,
) {
  const dragIndex = ref<number | null>(null);
  const overIndex = ref<number | null>(null);
  const isDragging = ref(false);

  let draggedEl: HTMLElement | null = null;
  let ghostEl: HTMLElement | null = null;
  let offsetY = 0;
  let startY = 0;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let isTouch = false;
  let activePointerId: number | null = null;

  // Computed: the preview order of IDs while dragging
  const previewIds = computed(() => {
    if (
      !isDragging.value ||
      dragIndex.value === null ||
      overIndex.value === null ||
      dragIndex.value === overIndex.value
    ) {
      return itemIds.value;
    }
    const ids = [...itemIds.value];
    const [moved] = ids.splice(dragIndex.value, 1);
    ids.splice(overIndex.value, 0, moved);
    return ids;
  });

  function getItemElements(): HTMLElement[] {
    if (!containerRef.value) return [];
    return Array.from(
      containerRef.value.querySelectorAll("[data-sortable-id]"),
    ) as HTMLElement[];
  }

  function createGhost(el: HTMLElement, clientY: number) {
    const rect = el.getBoundingClientRect();
    offsetY = clientY - rect.top;

    ghostEl = el.cloneNode(true) as HTMLElement;
    ghostEl.style.position = "fixed";
    ghostEl.style.width = `${rect.width}px`;
    ghostEl.style.left = `${rect.left}px`;
    ghostEl.style.top = `${rect.top}px`;
    ghostEl.style.zIndex = "9999";
    ghostEl.style.pointerEvents = "none";
    ghostEl.style.opacity = "0.9";
    ghostEl.style.transform = "scale(1.02)";
    ghostEl.style.boxShadow = "0 12px 40px rgba(0,0,0,0.3)";
    ghostEl.style.borderRadius = "8px";
    ghostEl.style.transition = "none";
    ghostEl.style.willChange = "top";
    document.body.appendChild(ghostEl);
  }

  function moveGhost(clientY: number) {
    if (!ghostEl) return;
    ghostEl.style.top = `${clientY - offsetY}px`;
  }

  function removeGhost() {
    if (ghostEl) {
      ghostEl.remove();
      ghostEl = null;
    }
  }

  function findOverIndex(clientY: number): number {
    const els = getItemElements();
    for (let i = 0; i < els.length; i++) {
      const rect = els[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (clientY < mid) return i;
    }
    return els.length - 1;
  }

  function startDrag(index: number, el: HTMLElement, clientY: number) {
    isDragging.value = true;
    dragIndex.value = index;
    overIndex.value = index;
    draggedEl = el;

    el.style.opacity = "0.15";

    createGhost(el, clientY);

    document.addEventListener("pointermove", onDocPointerMove);
    document.addEventListener("pointerup", onDocPointerUp);
    document.addEventListener("pointercancel", onDocPointerUp);
  }

  function onDocPointerMove(e: PointerEvent) {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    if (!isDragging.value) return;
    e.preventDefault();

    moveGhost(e.clientY);

    const newIndex = findOverIndex(e.clientY);
    if (newIndex !== overIndex.value) {
      overIndex.value = newIndex;
    }
  }

  function onDocPointerUp(e: PointerEvent) {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    cancelLongPress();
    finishDrag();
  }

  function finishDrag() {
    document.removeEventListener("pointermove", onDocPointerMove);
    document.removeEventListener("pointerup", onDocPointerUp);
    document.removeEventListener("pointercancel", onDocPointerUp);

    if (
      isDragging.value &&
      dragIndex.value !== null &&
      overIndex.value !== null &&
      dragIndex.value !== overIndex.value
    ) {
      const ids = [...itemIds.value];
      const [moved] = ids.splice(dragIndex.value, 1);
      ids.splice(overIndex.value, 0, moved);
      options.onReorder(ids);
    }

    if (draggedEl) {
      draggedEl.style.opacity = "";
      draggedEl = null;
    }

    removeGhost();
    dragIndex.value = null;
    overIndex.value = null;
    isDragging.value = false;
    isTouch = false;
    activePointerId = null;
  }

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function onPointerDown(e: PointerEvent, index: number) {
    const el = (e.currentTarget as HTMLElement).closest(
      "[data-sortable-id]",
    ) as HTMLElement | null;
    if (!el) return;

    e.preventDefault();
    isTouch = e.pointerType === "touch";
    startY = e.clientY;
    activePointerId = e.pointerId;

    if (isTouch) {
      longPressTimer = setTimeout(() => {
        startDrag(index, el, e.clientY);
      }, 200);
      // Also listen for move to cancel long press
      const onTouchMove = (me: PointerEvent) => {
        if (Math.abs(me.clientY - startY) > 8) {
          cancelLongPress();
          document.removeEventListener("pointermove", onTouchMove);
        }
      };
      document.addEventListener("pointermove", onTouchMove);
      const cleanup = () => {
        cancelLongPress();
        document.removeEventListener("pointermove", onTouchMove);
        document.removeEventListener("pointerup", cleanup);
        document.removeEventListener("pointercancel", cleanup);
      };
      document.addEventListener("pointerup", cleanup, { once: true });
      document.addEventListener("pointercancel", cleanup, { once: true });
    } else {
      startDrag(index, el, e.clientY);
    }
  }

  onUnmounted(() => {
    cancelLongPress();
    if (isDragging.value) finishDrag();
  });

  return {
    dragIndex,
    overIndex,
    isDragging,
    previewIds,
    onPointerDown,
  };
}
