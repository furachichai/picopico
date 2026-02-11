property const, pState, pStateAnim, pDestX, pDestY, pFutDestX, pFutDestY, pX, pY, pIsoX, pIsoZ, pDir, pS, pStateGoto, pWait, pParts, pDepthNotYet, pFrameStart, pGoToMourn, pFrameStop, pAnimInfo, pMournFacing, pChangeDest, pPrevMedia, pUndoEvil, pKludge, pKludge2
global oG, oSound

on new me, thenum, animinfo, themedia, prevmedia, themode
  const = [#BSTOP: 0, #BGOTO: 1, #BAVOIDHORIZ: 2, #BAVOIDVERT: 3, #BMOURN: 4, #BDEAD: 5, #BTURN: 6, #GNORTH: 0, #GSOUTH: 1, #GWEST: 2, #GEAST: 3, #GCRYNORTH: 4, #GCRYSOUTH: 5, #GCRYWEST: 6, #GCRYEAST: 7, #GTURNNORTH: 8, #GTURNSOUTH: 9, #GTURNWEST: 10, #GTURNEAST: 11, #GDEAD: 12]
  me.pAnimInfo = animinfo
  me.pState = me.const.BSTOP
  me.pWait = 0
  me.pParts = 6
  me.pDepthNotYet = 0
  me.pGoToMourn = 0
  me.pChangeDest = 0
  me.pUndoEvil = 0
  me.pPrevMedia = prevmedia
  me.pKludge = 0
  me.pKludge2 = 0
  me.pX = random(oG.MAPWIDTH) - 1
  me.pY = random(oG.MAPHEIGHT) - 1
  if themode = oG.ONOFFSCREEN then
    repeat while not TileOnMap(me.pX, me.pY) or PosNotEmpty(me.pX, me.pY)
      me.pX = random(oG.MAPWIDTH) - 1
      me.pY = random(oG.MAPHEIGHT) - 1
    end repeat
  else
    if themode = oG.OnScreen then
      repeat while not TileOnScreen(me.pX, me.pY) or PosNotEmpty(me.pX, me.pY)
        me.pX = random(oG.MAPWIDTH) - 1
        me.pY = random(oG.MAPHEIGHT) - 1
      end repeat
    else
      if themode = oG.OFFSCREEN then
        repeat while not TileOnMap(me.pX, me.pY) or TileOnScreen(me.pX, me.pY) or PosNotEmpty(me.pX, me.pY)
          me.pX = random(oG.MAPWIDTH) - 1
          me.pY = random(oG.MAPHEIGHT) - 1
        end repeat
      end if
    end if
  end if
  me.pIsoX = me.pX * oG.ISOTILEWIDTH
  me.pIsoZ = me.pY * oG.ISOTILEHEIGHT * -1
  me.pFrameStart = 1
  me.pFrameStop = 8
  me.pS = sprite(thenum)
  me.pS.member = themedia
  me.pS.puppet = 1
  me.pS.ink = 36
  me.pS.blend = 100
  me.pS.rotation = 0
  PutFilmLoopOnScreen(me.pS, me.pIsoX, 0, me.pIsoZ)
  me.pS.visible = 1
  me.mSetDepth()
  return me
end

on mGetX me
  return me.pX
end

on mGetY me
  return me.pY
end

on mGoTo me, destx, DestY
  me.pState = me.const.BGOTO
  me.pDestX = destx
  me.pDestY = DestY
  me.pWait = me.pParts
  me.mProcessGrid()
end

on mGoToMourn me, destx, DestY, facing
  me.pGoToMourn = 1
  me.pChangeDest = 1
  me.pFutDestX = destx
  me.pFutDestY = DestY
  me.pMournFacing = facing
end

on mUndoEvil me
  me.pUndoEvil = 1
  me.pChangeDest = 1
  me.pFutDestX = me.pX
  me.pFutDestY = me.pY
end

on mMoveHoriz me
  if me.pX > me.pDestX then
    if PosNotEmpty(me.pX - 1, me.pY) then
      return 0
    else
      me.pX = me.pX - 1
      me.pStateGoto = me.const.GWEST
      me.mSetAnim(me.const.GWEST)
      return 1
    end if
  end if
  if me.pX < me.pDestX then
    if PosNotEmpty(me.pX + 1, me.pY) then
      return 0
    else
      me.pX = me.pX + 1
      me.pStateGoto = me.const.GEAST
      me.mSetAnim(me.const.GEAST)
      return 1
    end if
  end if
end

on mMoveVert me
  if me.pY > me.pDestY then
    if PosNotEmpty(me.pX, me.pY - 1) then
      return 0
    else
      me.pY = me.pY - 1
      me.pStateGoto = me.const.GNORTH
      me.mSetAnim(me.const.GNORTH)
      return 1
    end if
  end if
  if me.pY < me.pDestY then
    if PosNotEmpty(me.pX, me.pY + 1) then
      return 0
    else
      me.pY = me.pY + 1
      me.pStateGoto = me.const.GSOUTH
      me.mSetAnim(me.const.GSOUTH)
      return 1
    end if
  end if
end

on mAvoidHoriz me
  if not me.mMoveVert() then
    me.pX = me.pX + me.pDir
    if me.pDir = 1 then
      me.pStateGoto = me.const.GEAST
      me.mSetAnim(me.const.GEAST)
    else
      me.pStateGoto = me.const.GWEST
      me.mSetAnim(me.const.GWEST)
    end if
  else
    me.pState = me.const.BGOTO
  end if
end

on mAvoidVert me
  if not me.mMoveHoriz() then
    me.pY = me.pY + me.pDir
    if me.pDir = 1 then
      me.pStateGoto = me.const.GSOUTH
      me.mSetAnim(me.const.GSOUTH)
    else
      me.pStateGoto = me.const.GNORTH
      me.mSetAnim(me.const.GNORTH)
    end if
  else
    me.pState = me.const.BGOTO
  end if
end

on mProcessGrid me
  case me.pState of
    0:
      tempx = random(oG.MAPWIDTH) - 1
      tempy = random(oG.MAPHEIGHT) - 1
      repeat while not TileOnMap(tempx, tempy) or PosNotEmpty(tempx, tempy)
        tempx = random(oG.MAPWIDTH) - 1
        tempy = random(oG.MAPHEIGHT) - 1
      end repeat
      me.mGoTo(tempx, tempy)
    1:
      me.mChangeTile()
    2:
      me.mAvoidHoriz()
    3:
      me.mAvoidVert()
  end case
end

on mChangeTile me
  if me.pChangeDest then
    me.pChangeDest = 0
    me.pDestX = me.pFutDestX
    me.pDestY = me.pFutDestY
    if not me.pUndoEvil then
      me.pParts = me.pParts / 2
    end if
  end if
  if (me.pX = me.pDestX) and (me.pY = me.pDestY) then
    if me.pGoToMourn then
      me.pState = me.const.BMOURN
      me.pParts = me.pParts * 2
      oSound.mPlayCry()
      me.mSetAnim(me.const.GCRYNORTH + me.pMournFacing)
      me.pWait = oG.WAITMOURN * oG.fps
    else
      if me.pUndoEvil then
        me.pState = me.const.BTURN
        me.pKludge = 1
      else
        me.pState = me.const.BSTOP
        me.mProcessGrid()
      end if
    end if
  else
    if me.pX = me.pDestX then
      if not me.mMoveVert() then
        me.pState = me.const.BAVOIDHORIZ
        if random(2) = 1 then
          pDir = 1
        else
          pDir = -1
        end if
        me.mAvoidHoriz()
      end if
    else
      if me.pY = me.pDestY then
        if not me.mMoveHoriz() then
          me.pState = me.const.BAVOIDVERT
          if me.pY < me.pDestY then
            pDir = 1
          else
            pDir = -1
          end if
          me.mAvoidVert()
        end if
      else
        if random(2) = 1 then
          if not me.mMoveVert() then
            me.pState = me.const.BAVOIDHORIZ
            if me.pX < me.pDestX then
              pDir = 1
            else
              pDir = -1
            end if
            me.mAvoidHoriz()
          end if
        else
          if not me.mMoveHoriz() then
            me.pState = me.const.BAVOIDVERT
            if random(2) = 1 then
              pDir = 1
            else
              pDir = -1
            end if
            me.mAvoidVert()
          end if
        end if
      end if
    end if
  end if
end

on mMove me
  if not me.pDepthNotYet and (me.pWait <= (me.pParts / 2)) then
    me.pDepthNotYet = 1
    me.mSetDepth()
  end if
  if (me.pWait - 1) = 0 then
    me.pIsoX = me.pX * oG.ISOTILEWIDTH
    me.pIsoZ = me.pY * oG.ISOTILEHEIGHT * -1
    me.pDepthNotYet = 0
  else
    case me.pStateGoto of
      0:
        me.pIsoZ = me.pIsoZ + (oG.ISOTILEHEIGHT / me.pParts)
      1:
        me.pIsoZ = me.pIsoZ - (oG.ISOTILEHEIGHT / me.pParts)
      2:
        me.pIsoX = me.pIsoX - (oG.ISOTILEWIDTH / me.pParts)
      3:
        me.pIsoX = me.pIsoX + (oG.ISOTILEWIDTH / me.pParts)
    end case
  end if
  PutFilmLoopOnScreen(me.pS, me.pIsoX, 0, me.pIsoZ)
  me.pWait = me.pWait - 1
end

on mSetDepth me
  me.pS.locZ = oG.PERSON1STSPRITE + GetTileDepth(me.pX, me.pY)
end

on mSetAnim me, dir
  if me.pStateAnim <> dir then
    me.pStateAnim = dir
    if me.pStateAnim < me.const.GCRYNORTH then
      me.pFrameStart = (me.pStateAnim * 8) + 1
      me.pFrameStop = me.pFrameStart + 7
      tell me.pS
        go(me.pFrameStart + random(8) - 1)
      end tell
    else
      if me.pStateAnim < me.const.GTURNNORTH then
        me.pFrameStart = me.pAnimInfo.crystart + ((me.pStateAnim - me.const.GCRYNORTH) * me.pAnimInfo.crylength)
        me.pFrameStop = me.pFrameStart + me.pAnimInfo.crylength - 1
        tell me.pS
          go(me.pFrameStart)
        end tell
      else
        if me.pStateAnim < me.const.GDEAD then
          me.pFrameStart = me.pAnimInfo.turnstart + ((me.pStateAnim - me.const.GTURNNORTH) * me.pAnimInfo.turnlength)
          me.pFrameStop = me.pFrameStart + me.pAnimInfo.turnlength - 1
          tell me.pS
            go(me.pFrameStart)
          end tell
        else
          if me.pStateAnim = me.const.GDEAD then
            me.pFrameStart = random(4) - 1 + me.pAnimInfo.deathstart
            me.pFrameStop = me.pFrameStart
            kludge = me.pFrameStart
            tell me.pS
              go(kludge)
            end tell
            return 1
          end if
        end if
      end if
    end if
  end if
end

on mCantMourn me
  if (me.pState = me.const.BDEAD) or me.pGoToMourn or (me.pState = me.const.BMOURN) or (me.pState = me.const.BTURN) or me.pUndoEvil then
    return 1
  else
    return 0
  end if
end

on mDie me, tilex, tiley
  me.pX = tilex
  me.pY = tiley
  me.pState = me.const.BDEAD
  me.pWait = (oG.WAITDEAD * oG.fps) + random(oG.WAITRANDOMDEAD * oG.fps) - 1
  me.pIsoX = me.pX * oG.ISOTILEWIDTH
  me.pIsoZ = me.pY * oG.ISOTILEHEIGHT * -1
  me.mSetAnim(me.const.GDEAD)
  me.pS.locZ = oG.PERSON1STSPRITE - 1
  PutDeadOnScreen(me.pS, me.pIsoX, 0, me.pIsoZ)
end

on mIsAlive me
  if me.pState = me.const.BDEAD then
    return 0
  else
    return 1
  end if
end

on mDestroy me
  me.pS.puppet = 0
  me.pS.member = VOID
  me.pS.scriptInstanceList = []
end

on exitFrame me
  if me.pState = me.const.BDEAD then
    if pWait = 0 then
      DestroyPerson(me.pS)
    else
      pWait = pWait - 1
    end if
  else
    if me.pState = me.const.BMOURN then
      if pWait = 0 then
        oSound.mStopCry()
        me.pGoToMourn = 0
        me.pState = me.const.BTURN
        me.mSetAnim(me.pStateAnim + 4)
        oSound.mPlayPeople(oSound.STURN)
      else
        pWait = pWait - 1
      end if
    else
      if me.pState <> me.const.BTURN then
        if me.pState <> me.const.BSTOP then
          me.mMove()
        end if
        if me.pWait = 0 then
          me.pWait = me.pParts
          me.mProcessGrid()
        end if
      end if
    end if
  end if
  if me.pKludge2 then
    me.pKludge2 = 0
    me.mSetAnim(me.pStateAnim + 8)
    oSound.mPlayPeople(oSound.STURN)
  else
    if me.pKludge then
      me.pKludge = 0
      me.pKludge2 = 1
      tell me.pS
        if the frame = me.pFrameStop then
          go(me.pFrameStart - 1)
        end if
      end tell
      UndoEvil(me.pS)
    else
      if me.pState <> me.const.BTURN then
        tell me.pS
          if the frame = me.pFrameStop then
            go(me.pFrameStart - 1)
          end if
        end tell
      else
        isdone = 0
        tell me.pS
          if the frame = me.pFrameStop then
            isdone = 1
          end if
        end tell
        if isdone then
          me.pState = me.const.BSTOP
          if me.pUndoEvil then
            me.pWait = 0
            me.pUndoEvil = 0
          else
            me.pAnimInfo = [#deathstart: 33]
            TurnEvil(me.pS)
          end if
        end if
      end if
    end if
  end if
end
