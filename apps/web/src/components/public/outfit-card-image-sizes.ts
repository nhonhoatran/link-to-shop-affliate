// `sizes` must be a literal string. Grid is 2 / 3 / 4 columns below 768px / from 768px / from 1024px;
// the container stops growing at --client-container-max (1200px) plus its 32px gutters, so a 4-column card is at most ~266px.
export const OUTFIT_CARD_IMAGE_SIZES = '(min-width: 1264px) 266px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw';
