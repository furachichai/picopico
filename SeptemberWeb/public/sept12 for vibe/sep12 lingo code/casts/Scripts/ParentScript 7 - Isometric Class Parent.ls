property pTheta, pAlpha, pSinTheta, pSinAlpha, pCosTheta, pCosAlpha
global oG

on new me
  me.pTheta = 30 * (PI / 180)
  me.pAlpha = 45 * (PI / 180)
  me.pSinTheta = sin(me.pTheta)
  me.pCosTheta = cos(me.pTheta)
  me.pSinAlpha = sin(me.pAlpha)
  me.pCosAlpha = cos(me.pAlpha)
  return me
end

on mMapToScreen me, xpp, ypp, zpp
  yp = ypp
  xp = (xpp * me.pCosAlpha) + (zpp * me.pSinAlpha)
  zp = (zpp * me.pCosAlpha) - (xpp * me.pSinAlpha)
  thex = xp
  they = (yp * me.pCosTheta) - (zp * me.pSinTheta)
  return [#thex: oG.ISOSTARTX + thex, #they: oG.ISOSTARTY + they]
end

on mMapToIsoWorld me, screenx, screeny
  screenx = screenx - oG.ISOSTARTX
  screeny = screeny - oG.ISOSTARTY
  thez = ((screenx / me.pCosAlpha) - (screeny / (me.pSinAlpha * me.pSinTheta))) * (1 / ((me.pCosAlpha / me.pSinAlpha) + (me.pSinAlpha / me.pCosAlpha)))
  thex = 1 / me.pCosAlpha * (screenx - (thez * me.pSinAlpha))
  return [#thex: thex - (oG.ISOTILEWIDTH / 2), #thez: thez + (oG.ISOTILEHEIGHT / 2)]
end
