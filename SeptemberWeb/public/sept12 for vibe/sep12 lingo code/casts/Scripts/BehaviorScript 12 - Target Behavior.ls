property pEnabled
global oG, oSound

on beginSprite me
  cursor(0)
  cursor(200)
  sprite(me.spriteNum).locZ = oG.TARGETDEPTH
  me.pEnabled = 1
end

on prepareFrame me
  thex = the mouseH
  they = the mouseV
  if thex < 0 then
    sprite(me.spriteNum).locH = 0
  else
    if thex >= oG.screenx then
      sprite(me.spriteNum).locH = oG.screenx - 1
    else
      sprite(me.spriteNum).locH = thex
    end if
  end if
  if they < 0 then
    sprite(me.spriteNum).locV = 0
  else
    if they >= oG.screeny then
      sprite(me.spriteNum).locV = oG.screeny - 1
    else
      sprite(me.spriteNum).locV = they
    end if
  end if
end

on mIsEnabled me
  return me.pEnabled
end

on mDisable me
  me.pEnabled = 0
  sprite(me.spriteNum).goToFrame(1)
  sprite(me.spriteNum).play()
end

on mEnable me
  me.pEnabled = 1
end

on exitFrame me
  if not me.mIsEnabled() then
    if sprite(me.spriteNum).frame = sprite(me.spriteNum).member.frameCount then
      sprite(me.spriteNum).mEnable()
    end if
  end if
end
