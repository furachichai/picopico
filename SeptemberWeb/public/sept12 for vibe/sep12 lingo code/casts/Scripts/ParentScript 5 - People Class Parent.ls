property MAXPEOPLETYPE, TWOMAN, TKID, TDOG, TMAN, TEVIL, pEmptySpriteArray, pUsedSpriteArray, pWait, pMediaArray, pProbArray, pEvilCount, pEvilToRegenerate
global oG

on new me
  put "PEOPLE OBJECT CREATED"
  me.TWOMAN = 1
  me.TKID = 2
  me.TDOG = 3
  me.TMAN = 4
  me.TEVIL = 5
  me.MAXPEOPLETYPE = 5
  me.pEmptySpriteArray = []
  me.pUsedSpriteArray = []
  me.pWait = oG.GENERATIONRATIO * oG.fps
  me.pEvilCount = 0
  me.pEvilToRegenerate = 0
  repeat with i = oG.PERSON1STSPRITE to oG.PERSON1STSPRITE + oG.MAXPEOPLE - 1
    me.pEmptySpriteArray.append(sprite(i))
  end repeat
  me.pMediaArray = [member("FullWoman"), member("FullKid"), member("FullDog"), member("FullMan"), member("FullEvil")]
  me.pProbArray = [40, 25, 5, 40]
  return me
end

on mGetRandomPerson me
  repeat with i = 1 to me.pProbArray.count - 1
    if random(100) <= me.pProbArray[i] then
      return i
    end if
  end repeat
  return me.TMAN
end

on mCreatePerson me, themode
  if me.pEmptySpriteArray.count > 0 then
    thesprite = me.pEmptySpriteArray[1]
    me.pEmptySpriteArray.deleteAt(1)
    me.pUsedSpriteArray.append(thesprite)
    tempperson = me.mGetRandomPerson()
    if me.pEvilToRegenerate > 0 then
      repeat while tempperson = me.TDOG
        tempperson = me.mGetRandomPerson()
      end repeat
      prevmedia = me.pMediaArray[tempperson]
      tempperson = me.TEVIL
      me.pEvilCount = me.pEvilCount + 1
      me.pEvilToRegenerate = me.pEvilToRegenerate - 1
    else
      if me.pEvilCount < oG.EVILMIN then
        repeat while tempperson = me.TDOG
          tempperson = me.mGetRandomPerson()
        end repeat
        prevmedia = me.pMediaArray[tempperson]
        tempperson = me.TEVIL
        me.pEvilCount = me.pEvilCount + 1
      else
        prevmedia = me.pMediaArray[tempperson]
      end if
    end if
    obj = me.mCreateFrames(tempperson)
    thesprite.scriptInstanceList.add(script("Person Class Behavior").new(thesprite.spriteNum, obj, me.pMediaArray[tempperson], prevmedia, themode))
  else
    put "mCreatePerson ERROR! OUT OF SPRITES TO CREATE PERSON"
  end if
end

on mCreateFrames me, thetype
  if thetype = me.TWOMAN then
    obj = [#crystart: 33, #crylength: 10, #turnstart: 73, #turnlength: 31, #deathstart: 197]
  else
    if thetype = me.TKID then
      obj = [#crystart: 33, #crylength: 3, #turnstart: 45, #turnlength: 31, #deathstart: 169]
    else
      if thetype = me.TDOG then
        obj = [#deathstart: 33]
      else
        if thetype = me.TMAN then
          obj = [#crystart: 33, #crylength: 20, #turnstart: 113, #turnlength: 31, #deathstart: 237]
        else
          if thetype = me.TEVIL then
            obj = [#deathstart: 33]
          end if
        end if
      end if
    end if
  end if
  return obj
end

on mCreateFrames2 me, themedia
  repeat with i = 1 to me.pMediaArray.count
    if themedia = me.pMediaArray[i] then
      obj = me.mCreateFrames(i)
      exit repeat
    end if
  end repeat
  return obj
end

on mPopulate me
  repeat with i = 1 to oG.STARTPEOPLE
    me.mCreatePerson(oG.ONOFFSCREEN)
  end repeat
end

on mGenerate me
  if me.pWait = 0 then
    if me.pUsedSpriteArray.count < oG.MAXPEOPLE then
      me.mCreatePerson(oG.OFFSCREEN)
    end if
    me.pWait = (oG.GENERATIONRATIO * oG.fps) + random(oG.RANDGENERATIONRATIO * oG.fps)
  else
    me.pWait = me.pWait - 1
  end if
end

on mUndoEvil me, amount
  array = []
  thecount = 0
  repeat with i = 1 to me.pUsedSpriteArray.count
    thesprite = me.pUsedSpriteArray[i]
    if thesprite.member = me.pMediaArray[me.TEVIL] then
      if TileOnScreen(thesprite.mGetX(), thesprite.mGetY()) then
        array.addAt(1, thesprite)
        thecount = thecount + 1
        if thecount = amount then
          exit repeat
        end if
        next repeat
      end if
      array.append(thesprite)
    end if
  end repeat
  if amount < array.count then
    themax = amount
  else
    themax = array.count
  end if
  if (me.pEvilCount - themax - oG.EVILMIN) < 1 then
    themax = me.pEvilCount - oG.EVILMIN
  end if
  repeat with i = 1 to themax
    array[i].mUndoEvil()
  end repeat
end

on mKill me, centerx, centery
  distancearray = []
  tomournarray = []
  xstart = centerx - oG.BLASTX
  ystart = centery - oG.BLASTY
  xfinish = centerx + oG.BLASTX
  yfinish = centery + oG.BLASTY
  repeat with i = 1 to me.pUsedSpriteArray.count
    thesprite = me.pUsedSpriteArray[i]
    thex = thesprite.mGetX()
    they = thesprite.mGetY()
    if (thex >= xstart) and (thex <= xfinish) and (they >= ystart) and (they <= yfinish) and thesprite.mIsAlive() then
      tilex = thex
      tiley = they
      thesprite.mDie(tilex, tiley)
      if (thesprite.member <> me.pMediaArray[me.TEVIL]) and (thesprite.member <> me.pMediaArray[me.TDOG]) then
        array = []
        if PosEmpty(tilex, tiley + oG.DISTANCEFROMDEAD) then
          array.append([#tilex: tilex, #tiley: tiley + oG.DISTANCEFROMDEAD, #facing: 0])
        end if
        if PosEmpty(tilex, tiley - oG.DISTANCEFROMDEAD) then
          array.append([#tilex: tilex, #tiley: tiley - oG.DISTANCEFROMDEAD, #facing: 1])
        end if
        if PosEmpty(tilex + oG.DISTANCEFROMDEAD, tiley) then
          array.append([#tilex: tilex + oG.DISTANCEFROMDEAD, #tiley: tiley, #facing: 2])
        end if
        if PosEmpty(tilex - oG.DISTANCEFROMDEAD, tiley) then
          array.append([#tilex: tilex - oG.DISTANCEFROMDEAD, #tiley: tiley, #facing: 3])
        end if
        tomournarray.append(array)
      end if
    end if
  end repeat
  if tomournarray.count > 0 then
    repeat with i = 1 to me.pUsedSpriteArray.count
      thesprite = me.pUsedSpriteArray[i]
      if me.mCanMourn(thesprite) then
        dist = abs(centerx - thesprite.mGetX()) + abs(centery - thesprite.mGetY())
        obj = [#thesprite: thesprite, #dist: dist]
        j = 1
        repeat while j <= distancearray.count
          if distancearray[j].dist > obj.dist then
            exit repeat
            next repeat
          end if
          j = j + 1
        end repeat
        distancearray.addAt(j, obj)
      end if
    end repeat
    i = 1
    j = 1
    peopletomourn = tomournarray.count * oG.EVILPERDEATH
    repeat while (i <= distancearray.count) and (i <= peopletomourn)
      if distancearray[i].dist < oG.MOURNDISTANCE then
        thesprite = distancearray[i].thesprite
        i = i + 1
        if tomournarray[j].count > 0 then
          temppos = random(tomournarray[j].count)
          obj = tomournarray[j][temppos]
          thesprite.mGoToMourn(obj.tilex, obj.tiley, obj.facing)
          tomournarray[j].deleteAt(temppos)
          j = j + 1
          if j > tomournarray.count then
            j = 1
          end if
        end if
        next repeat
      end if
      exit repeat
    end repeat
  end if
end

on mCanMourn me, thesprite
  if (thesprite.member = me.pMediaArray[me.TEVIL]) or (thesprite.member = me.pMediaArray[me.TDOG]) or thesprite.mCantMourn() then
    return 0
  else
    return 1
  end if
end
