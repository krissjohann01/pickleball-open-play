on run
	try
		do shell script "/Users/johann/projects/pickleball-open-play/scripts/start.sh"
	on error errMsg
		display dialog "Berean Pickleball Open Play couldn't start:" & return & return & errMsg with title "Berean Pickleball Open Play" buttons {"OK"} default button 1 with icon stop
	end try
end run
