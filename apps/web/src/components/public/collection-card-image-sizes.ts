// Same container as the outfit grid: it stops growing at --client-container-max (1200px) plus 32px gutters.
const CONTAINER_MAX_PX = 1200;
const CONTAINER_WITH_GUTTERS_PX = 1264;

// Grid is 2 columns below 768px, 3 (or fewer when `columnsDesktop` is smaller) from 768px, `columnsDesktop` from 1024px.
export const collectionCardImageSizes = (columnsDesktop: number): string => {
  const mediumColumns = Math.min(3, columnsDesktop);
  return [
    `(min-width: ${CONTAINER_WITH_GUTTERS_PX}px) ${Math.ceil(CONTAINER_MAX_PX / columnsDesktop)}px`,
    `(min-width: 1024px) ${Math.ceil(100 / columnsDesktop)}vw`,
    `(min-width: 768px) ${Math.ceil(100 / mediumColumns)}vw`,
    '50vw',
  ].join(', ');
};
