global waitstreaming

on exitFrame me
  if waitstreaming then
    go(the frame)
  else
    go(marker("MInit"))
  end if
end
