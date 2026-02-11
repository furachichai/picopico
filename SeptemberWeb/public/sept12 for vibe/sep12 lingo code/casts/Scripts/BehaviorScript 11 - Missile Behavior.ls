property pBlastArray, pBlastArrayWidth, pLaunched, pTileX, pTileY, pExplotionDepth, pGround, EXPLOTIONFRAME, DESTROYFRAME
global oG, oSound

on beginSprite me
  sprite(me.spriteNum).ink = 36
  sprite(me.spriteNum).blend = 100
  sprite(me.spriteNum).visible = 0
  me.EXPLOTIONFRAME = 16
  me.DESTROYFRAME = 23
  me.pLaunched = 0
  me.mCreateBlastArray()
end

on exitFrame me
  if me.pLaunched then
    if sprite(me.spriteNum).frame = me.EXPLOTIONFRAME then
      oSound.mStop(oSound.SMISSILE)
      oSound.mPlay(oSound.SEXPLOTION)
      sprite(me.spriteNum).locZ = me.pExplotionDepth
    else
      if sprite(me.spriteNum).frame = me.DESTROYFRAME then
        Explotion(me.pGround, me.pTileX, me.pTileY)
      else
        if not sprite(me.spriteNum).playing then
          me.pLaunched = 0
          sprite(me.spriteNum).visible = 0
        end if
      end if
    end if
  end if
end

on mCreateBlastArray me
  me.pBlastArray = []
  me.pBlastArrayWidth = (oG.BLASTX * 2) + 1
  xstart = 0
  xfinish = oG.BLASTX * 2
  ystart = 0
  yfinish = oG.BLASTY * 2
  val = oG.BLASTDAMAGE - (oG.BLASTX * oG.BLASTDECREMENT)
  if val < 1 then
    tempval = 1
  else
    tempval = val
  end if
  repeat with i = xstart to xfinish
    repeat with j = ystart to yfinish
      me.pBlastArray.append(0)
    end repeat
  end repeat
  repeat with i = 0 to oG.BLASTX
    repeat with k = ystart to yfinish
      repeat with j = xstart to xfinish
        me.pBlastArray[me.mGetIndex(j, k)] = tempval
      end repeat
    end repeat
    xstart = xstart + 1
    ystart = ystart + 1
    xfinish = xfinish - 1
    yfinish = yfinish - 1
    val = val + oG.BLASTDECREMENT
    if val < 1 then
      tempval = 1
      next repeat
    end if
    tempval = val
  end repeat
end

on mGetIndex me, thex, they
  return thex + (they * me.pBlastArrayWidth) + 1
end

on mGetDamage me, thex, they
  return me.pBlastArray[me.mGetIndex(thex, they)]
end

on mLaunch me, thebottom, tilex, tiley, thex, they, thedepth
  me.pLaunched = 1
  me.pTileX = tilex
  me.pTileY = tiley
  me.pExplotionDepth = thedepth
  me.pGround = thebottom
  sprite(me.spriteNum).locH = thex
  sprite(me.spriteNum).locV = they
  sprite(me.spriteNum).locZ = oG.TARGETDEPTH - 1
  if thex > (oG.screenx / 2) then
    sprite(me.spriteNum).flipH = 1
  else
    sprite(me.spriteNum).flipH = 0
  end if
  sprite(me.spriteNum).goToFrame(1)
  sprite(me.spriteNum).visible = 1
  sprite(me.spriteNum).play()
  oSound.mPlay(oSound.SMISSILE)
end

on mWasLaunched me
  return me.pLaunched
end
