property MAPMEDIANAME, pArray, pWidth, pHeight, pISOTILEWIDTH, pISOTILEHEIGHT, pTileOnMapWidth, pTileOnMapHeight, pS
global oG, oIso, oBuilding

on new me
  me.MAPMEDIANAME = "Map"
  member(me.MAPMEDIANAME).regPoint = point(oG.screenx, oG.screeny / 2)
  sprite(oG.SPRITEMAP).locH = oG.screenx / 2
  sprite(oG.SPRITEMAP).locV = oG.screeny / 2
  me.pS = sprite(oG.SPRITEMAP)
  me.pWidth = oG.MAPWIDTH
  me.pHeight = oG.MAPHEIGHT
  me.pISOTILEWIDTH = oG.ISOTILEWIDTH
  me.pISOTILEHEIGHT = oG.ISOTILEHEIGHT
  me.pTileOnMapWidth = member("Square", oG.MEDIACASTNUMBER).width
  me.pTileOnMapHeight = member("Square", oG.MEDIACASTNUMBER).height
  me.mCreateEmptyArray()
  return me
end

on mGetIndex me, thex, they
  return thex + (they * me.pWidth) + 1
end

on mCreateEmptyArray me
  me.pArray = []
  thecount = -1
  repeat with tiley = 0 to me.pHeight - 1
    repeat with tilex = 0 to me.pWidth - 1
      obj = [#thedepth: thecount, #building: VOID]
      me.pArray[me.mGetIndex(tilex, tiley)] = obj
    end repeat
  end repeat
end

on mSetDepth me
  thecount = 0
  array = []
  thestate = 0
  tiley = 0
  repeat while tiley < me.pHeight
    tilex = 0
    case thestate of
      0:
        repeat while tilex < me.pWidth
          if me.mGetTileDepth(tilex, tiley) = -1 then
            building = me.mGetTileBuilding(tilex, tiley)
            if building = VOID then
              me.mSetTileDepth(thecount, tilex, tiley)
              thecount = thecount + 1
              tilex = tilex + 1
            else
              if building.thetype.theheight = 1 then
                me.mSetTileDepth(thecount, tilex, tiley)
                thecount = thecount + 1
                tilex = tilex + 1
              else
                thestate = 1
                obj = [#destx: tilex, #DestY: tiley + building.thetype.theheight - 1]
                array.addAt(1, obj)
                exit repeat
              end if
            end if
            next repeat
          end if
          tilex = tilex + 1
        end repeat
        tiley = tiley + 1
      1:
        repeat while tilex < array[1].destx
          if (tilex = (array[1].destx - 1)) and (tiley = array[1].DestY) then
            me.mSetTileDepth(thecount, tilex, tiley)
            thecount = thecount + 1
            obj = array[1]
            tilex = obj.destx
            building = me.mGetTileBuilding(tilex, tiley)
            tiley = obj.DestY - building.thetype.theheight + 1
            array.deleteAt(1)
            repeat with i = tilex to tilex + building.thetype.thewidth - 1
              repeat with j = tiley to tiley + building.thetype.theheight - 1
                me.mSetTileDepth(thecount, i, j)
              end repeat
            end repeat
            tilex = tilex + building.thetype.thewidth
            thecount = thecount + 1
            if array.count = 0 then
              thestate = 0
              exit repeat
            end if
            next repeat
          end if
          if me.mGetTileDepth(tilex, tiley) = -1 then
            building = me.mGetTileBuilding(tilex, tiley)
            if building = VOID then
              me.mSetTileDepth(thecount, tilex, tiley)
              thecount = thecount + 1
            else
              if building.thetype.theheight = 1 then
                me.mSetTileDepth(thecount, tilex, tiley)
                thecount = thecount + 1
              else
                obj = [#destx: tilex, #DestY: tiley + building.thetype.theheight - 1]
                array.addAt(1, obj)
                exit repeat
              end if
            end if
          end if
          tilex = tilex + 1
        end repeat
        if thestate = 1 then
          tiley = tiley + 1
        end if
    end case
  end repeat
end

on mDraw me
  repeat with i = 1 to oBuilding.pActualBuildingArray.count
    sprite(oG.BUILDING1STSPRITE + i - 1).locZ = oG.PERSON1STSPRITE + GetTileDepth(oBuilding.pActualBuildingArray[i].thex, oBuilding.pActualBuildingArray[i].they)
  end repeat
  oBuilding.mSortActualBuildingArray()
end

on mSetTileBuilding me, obj, thex, they
  me.pArray[thex + (they * me.pWidth) + 1].building = obj
end

on mGetTileBuilding me, thex, they
  return me.pArray[thex + (they * me.pWidth) + 1].building
end

on mSetTileDepth me, val, thex, they
  me.pArray[thex + (they * me.pWidth) + 1].thedepth = val
end

on mGetTileDepth me, thex, they
  return me.pArray[thex + (they * me.pWidth) + 1].thedepth
end
