import { useEffect, useState } from 'react';
import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from 'remotion';

export function Fonts() {
  const [handle] = useState(() => delayRender('Loading bundled Geist fonts'));
  useEffect(() => {
    Promise.all(
      [
        ['Regular', '400'],
        ['Semibold', '600'],
      ].map(async ([variant, weight]) => {
        const face = new FontFace(
          'Geist',
          `url(${staticFile(`fonts/Geist-${variant}.ttf`)})`,
          { weight },
        );
        document.fonts.add(await face.load());
      }),
    )
      .then(() => continueRender(handle))
      .catch(cancelRender);
  }, [handle]);
  return null;
}
