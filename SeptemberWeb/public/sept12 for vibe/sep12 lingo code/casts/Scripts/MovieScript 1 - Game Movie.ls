global waitstreaming, oG, oMap, oPeople, oIso, oBuilding, oSound

on CreateGlobalVar
  return [#screenx: 640, #screeny: 480, #fps: 16, #MAPWIDTH: 120, #MAPHEIGHT: 120, #MAPSIZEX: 1280, #MAPSIZEY: 640, #tilewidth: 20, #tileheight: 10, #ISOTILEWIDTH: 14, #ISOTILEHEIGHT: 14, #MAXPEOPLE: 100, #STARTPEOPLE: 100, #EVILMIN: 10, #EVILPERDEATH: 4, #EVILREGENERATION: 40, #GENERATIONRATIO: 1, #RANDGENERATIONRATIO: 1, #BLASTX: 5, #BLASTY: 5, #BLASTDAMAGE: 5, #BLASTDECREMENT: 1, #ISOSTARTX: (640 / 2) - (14 / 2), #ISOSTARTY: -325, #SCROLLHORIZ: 100, #SCROLLSTEP: 10, #SPRITEMAP: 1, #SPRITELOADING: 2, #SPRITEMENU: 3, #SPRITETARGET: 4, #SPRITEMISSILE: 7, #BUILDING1STSPRITE: 8, #PERSON1STSPRITE: 200, #TARGETDEPTH: 50000, #PEOPLEANIMLENGTH: 8 - 1, #OnScreen: 0, #OFFSCREEN: 1, #ONOFFSCREEN: 2, #MOURNDISTANCE: 25, #DISTANCEFROMDEAD: 2, #WAITDEAD: 30, #WAITRANDOMDEAD: 2, #WAITMOURN: 3, #WAITUNDOEVIL: 90, #UNDOEVILPEOPLE: 3, #BUILDINGHEALTHRECOVERY: 10, #BUILDINGHEALTHRECOVERYTIME: 30, #MEDIACASTNUMBER: 3, #pUndoEvilWait: 0, #pUndoEvilCount: 0]
end

on BeginGame
  put "----------------------"
  put "----------------------"
  put "-------NEW GAME-------"
  put "----------------------"
  put "----------------------"
  oG = CreateGlobalVar()
  oIso = script("Isometric Class Parent").new()
  oMap = script("Map Class Parent").new()
  oBuilding = script("Building Class Parent").new()
  oBuilding.mLoad()
  oMap.mDraw()
  oPeople = script("People Class Parent").new()
  oPeople.mPopulate()
  oSound = script("Sound Class Parent").new()
  oSound.mPlay(oSound.SAMBIENT)
  MissileInit()
  TargetInit()
  UndoEvilInit()
end

on PlayGame
  oPeople.mGenerate()
  oBuilding.mUpdate()
  UndoEvilUpdate()
  ScrollScreen()
end

on UndoEvilInit
  oG.pUndoEvilCount = 0
  UndoEvilWaitReset()
end

on UndoEvilWaitReset
  if oG.pUndoEvilCount = 0 then
    oG.pUndoEvilWait = oG.WAITUNDOEVIL * oG.fps
  else
    oG.pUndoEvilWait = oG.WAITUNDOEVIL * oG.fps / 2
  end if
end

on UndoEvilUpdate
  if oG.pUndoEvilWait = 0 then
    oG.pUndoEvilCount = oG.pUndoEvilCount + 1
    UndoEvilWaitReset()
    oPeople.mUndoEvil(oG.pUndoEvilCount * oG.UNDOEVILPEOPLE)
  else
    oG.pUndoEvilWait = oG.pUndoEvilWait - 1
  end if
end

on UndoEvil thesprite
  oPeople.pEvilCount = oPeople.pEvilCount - 1
  thesprite.member = thesprite.pPrevMedia
  thesprite.pAnimInfo = oPeople.mCreateFrames2(thesprite.pPrevMedia)
end

on PosNotEmpty thex, they
  if oMap.mGetTileBuilding(thex, they) = VOID then
    return 0
  else
    return 1
  end if
end

on PosEmpty thex, they
  if oMap.mGetTileBuilding(thex, they) = VOID then
    return 1
  else
    return 0
  end if
end

on GetTileDepth thex, they
  return oMap.mGetTileDepth(thex, they)
end

on MissileInit
  member("Missile").pausedAtStart = 1
  member("Missile").regPoint = point(121, 249)
end

on TargetInit
  member("Target").pausedAtStart = 1
end

on ScrollScreen
  thex = sprite(oG.SPRITETARGET).locH
  if (thex < oG.SCROLLHORIZ) and (sprite(oG.SPRITEMAP).left < 0) then
    diff = sprite(oG.SPRITEMAP).left + oG.SCROLLSTEP
    if diff > 0 then
      MoveEverythingHoriz(oG.SCROLLSTEP - diff)
    else
      MoveEverythingHoriz(oG.SCROLLSTEP)
    end if
  else
    if (thex > (oG.screenx - oG.SCROLLHORIZ)) and (sprite(oG.SPRITEMAP).right > oG.screenx) then
      diff = sprite(oG.SPRITEMAP).right - oG.SCROLLSTEP - oG.screenx
      if diff < 0 then
        MoveEverythingHoriz(-oG.SCROLLSTEP - diff)
      else
        MoveEverythingHoriz(-oG.SCROLLSTEP)
      end if
    end if
  end if
end

on MoveEverythingHoriz val
  sprite(oG.SPRITEMAP).locH = sprite(oG.SPRITEMAP).locH + val
  repeat with i = 1 to oBuilding.pActualBuildingArray.count
    thesprite = oBuilding.pActualBuildingArray[i].thesprite
    thesprite.locH = thesprite.locH + val
  end repeat
  repeat with i = 1 to oPeople.pUsedSpriteArray.count
    thesprite = oPeople.pUsedSpriteArray[i]
    thesprite.locH = thesprite.locH + val
  end repeat
  if sprite(oG.SPRITEMISSILE).mWasLaunched() then
    thesprite = sprite(oG.SPRITEMISSILE)
    thesprite.locH = thesprite.locH + val
  end if
  oG.ISOSTARTX = oG.ISOSTARTX + val
end

on floor val
  intX = bitOr(val, 0)
  if val = intX then
    return intX
  else
    if val > 0 then
      return intX
    else
      return intX - 1
    end if
  end if
end

on TileOnScreen tilex, tiley
  obj = oIso.mMapToScreen(tilex * oG.ISOTILEWIDTH, 0, tiley * oG.ISOTILEHEIGHT * -1)
  if (obj.thex < -20) or (obj.thex >= oG.screenx) or (obj.they < -10) or (obj.they >= oG.screeny) then
    return 0
  else
    return 1
  end if
end

on TileOnMap tilex, tiley
  obj = oIso.mMapToScreen(tilex * oG.ISOTILEWIDTH, 0, tiley * oG.ISOTILEHEIGHT * -1)
  if (obj.thex > sprite(oG.SPRITEMAP).left) and (obj.thex < sprite(oG.SPRITEMAP).right) and (obj.they > sprite(oG.SPRITEMAP).top) and (obj.they < sprite(oG.SPRITEMAP).bottom) then
    return 1
  else
    return 0
  end if
end

on RandTileOnMap
  randx = random(oG.MAPSIZEX) + sprite(oG.SPRITEMAP).left - 1
  randy = random(oG.MAPSIZEY) - 1
  obj = GetTileFromMap(randx, randy)
  return obj
end

on RandTileOnScreen
  randx = random(oG.screenx) - 1
  randy = random(oG.screeny) - 1
  obj = GetTileFromMap(randx, randy)
  return obj
end

on PutSpriteOnScreen thesprite, thex, they, thez
  obj = oIso.mMapToScreen(thex, they, thez)
  thesprite.locH = obj.thex
  thesprite.locV = obj.they
end

on PutFilmLoopOnScreen thesprite, thex, they, thez
  obj = oIso.mMapToScreen(thex, they, thez)
  thesprite.locH = obj.thex + (oG.tilewidth / 2) + 1
  thesprite.locV = obj.they - (thesprite.height / 2) + oG.tileheight
end

on PutDeadOnScreen thesprite, thex, they, thez
  obj = oIso.mMapToScreen(thex, they, thez)
  thesprite.locH = obj.thex + (oG.tilewidth / 2) + 1
  thesprite.locV = obj.they + (oG.tileheight / 2)
end

on GetTileFromMap screenx, screeny
  obj = oIso.mMapToIsoWorld(screenx, screeny)
  return [#tilex: floor(obj.thex / oG.ISOTILEWIDTH), #tiley: floor(obj.thez / oG.ISOTILEHEIGHT) * -1]
end

on TurnEvil thesprite
  oPeople.pEvilCount = oPeople.pEvilCount + 1
  thesprite.member = oPeople.pMediaArray[oPeople.TEVIL]
end

on DestroyPerson thesprite
  repeat with i = 1 to oPeople.pUsedSpriteArray.count
    if oPeople.pUsedSpriteArray[i] = thesprite then
      oPeople.pEmptySpriteArray.append(thesprite)
      oPeople.pUsedSpriteArray.deleteAt(i)
      if thesprite.member = oPeople.pMediaArray[oPeople.TEVIL] then
        oPeople.pEvilCount = oPeople.pEvilCount - 1
        if oPeople.pEvilCount > oG.EVILMIN then
          if random(100) <= oG.EVILREGENERATION then
            oPeople.pEvilToRegenerate = oPeople.pEvilToRegenerate + 1
          end if
        end if
      end if
      thesprite.mDestroy()
      exit repeat
    end if
  end repeat
end

on mouseUp
  if the frame = marker("MPlay") then
    if sprite(oG.SPRITETARGET).mIsEnabled() then
      oSound.mPlay(oSound.SCLICK)
      sprite(oG.SPRITETARGET).mDisable()
      UndoEvilInit()
      thex = sprite(oG.SPRITETARGET).locH
      they = sprite(oG.SPRITETARGET).locV
      if (thex >= 0) and (thex < oG.screenx) and (they >= 0) and (they < oG.screeny) then
        obj = oBuilding.mHit(thex, they)
        if obj.hitted then
          thebottom = obj.thebottom
          tilex = obj.building.thex - (obj.building.thetype.thewidth / 2)
          tiley = obj.building.they - (obj.building.thetype.theheight / 2)
        else
          thebottom = 1
          obj = GetTileFromMap(thex, they)
          tilex = obj.tilex
          tiley = obj.tiley
        end if
        thedepth = oG.PERSON1STSPRITE + GetTileDepth(tilex + oG.BLASTX, tiley + oG.BLASTY) + 1
        sprite(oG.SPRITEMISSILE).mLaunch(thebottom, tilex, tiley, thex, they, thedepth)
      end if
    end if
  end if
end

on mouseDown
  if the frame = marker("MPlay") then
    cursor(0)
    cursor(200)
  end if
end

on Explotion groundlevel, tilex, tiley
  if groundlevel then
    oBuilding.mExplode(tilex, tiley)
    oPeople.mKill(tilex, tiley)
  else
    oBuilding.mExplodeTall(tilex, tiley)
  end if
end

on GetBlastDamage thex, they
  return sprite(oG.SPRITEMISSILE).mGetDamage(thex, they)
end

on prepareMovie
  waitstreaming = 0
  tellStreamStatus(1)
end

on streamStatus url, state, bytesSoFar, bytesTotal, error
  waitstreaming = 1
  setVariable(sprite(499), "tempbytesloaded", string(bytesSoFar))
  setVariable(sprite(499), "tempbytestotal", string(bytesTotal))
  if state = "Complete" then
    tellStreamStatus(0)
    go(marker("MInit"))
  end if
end
