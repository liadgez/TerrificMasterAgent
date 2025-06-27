#!/usr/bin/osascript

-- OmniTask macOS Permissions Setup Script
-- This script helps guide users through granting necessary permissions

on run
    try
        -- Display welcome message
        display dialog "OmniTask Setup Assistant

This will help you grant the necessary permissions for OmniTask to automate your macOS system.

OmniTask needs:
• Accessibility permissions (for UI automation)
• Automation permissions (for app control)
• Full Disk Access (for file operations)

Click OK to continue." buttons {"Cancel", "OK"} default button "OK" with icon note
        
        if button returned of result is "Cancel" then
            return
        end if
        
        -- Test current permissions
        set hasAccessibility to testAccessibilityPermissions()
        set hasAutomation to testAutomationPermissions()
        
        -- Guide user through permission setup
        if not hasAccessibility then
            grantAccessibilityPermissions()
        end if
        
        if not hasAutomation then
            grantAutomationPermissions()
        end if
        
        -- Test AppleScript execution
        testAppleScriptExecution()
        
        -- Show completion message
        display dialog "🎉 Permission setup complete!

OmniTask should now be able to:
✓ Control system UI elements
✓ Automate applications
✓ Execute AppleScript commands

You can now start using OmniTask by running:
npm run dev

Then open: http://localhost:3000" buttons {"OK"} default button "OK" with icon note
        
        -- Send test notification
        display notification "OmniTask permissions setup complete!" with title "OmniTask Setup"
        
    on error errorMessage
        display dialog "Setup Error: " & errorMessage buttons {"OK"} default button "OK" with icon stop
    end try
end run

-- Test if accessibility permissions are granted
on testAccessibilityPermissions()
    try
        tell application "System Events"
            get name of processes
        end tell
        return true
    on error
        return false
    end try
end testAccessibilityPermissions

-- Test if automation permissions work
on testAutomationPermissions()
    try
        tell application "Finder"
            get name
        end tell
        return true
    on error
        return false
    end try
end testAutomationPermissions

-- Guide user to grant accessibility permissions
on grantAccessibilityPermissions()
    display dialog "Accessibility Permissions Required

OmniTask needs accessibility permissions to:
• Control UI elements
• Automate mouse and keyboard actions
• Interact with other applications

Click 'Open Settings' to grant permissions." buttons {"Skip", "Open Settings"} default button "Open Settings" with icon caution
    
    if button returned of result is "Open Settings" then
        try
            -- Open Security & Privacy preferences
            tell application "System Preferences"
                activate
                reveal pane id "com.apple.preference.security"
            end tell
            
            display dialog "In System Preferences:

1. Click 'Privacy' tab
2. Select 'Accessibility' from the list
3. Click the lock icon and enter your password
4. Find 'Terminal' or 'osascript' in the list
5. Check the box to enable it

Click 'Done' when you've granted permissions." buttons {"Done"} default button "Done"
            
            tell application "System Preferences"
                quit
            end tell
            
        on error
            display dialog "Please manually open:
System Preferences > Security & Privacy > Privacy > Accessibility

And grant permissions to Terminal or osascript." buttons {"OK"} default button "OK"
        end try
    end if
end grantAccessibilityPermissions

-- Guide user to grant automation permissions
on grantAutomationPermissions()
    display dialog "Automation Permissions Required

OmniTask needs automation permissions to:
• Control applications like Finder, Safari, etc.
• Execute system commands
• Manage files and folders

The system will prompt you to grant these permissions as needed." buttons {"OK"} default button "OK" with icon note
end grantAutomationPermissions

-- Test AppleScript execution
on testAppleScriptExecution()
    try
        -- Test basic AppleScript commands
        set currentDate to (current date) as string
        
        -- Test System Events
        tell application "System Events"
            set processCount to count of processes
        end tell
        
        -- Test Finder
        tell application "Finder"
            set homeFolder to home folder as string
        end tell
        
        display dialog "✅ AppleScript Test Successful

OmniTask can now execute AppleScript commands for:
• System control
• Application automation  
• File operations

Found " & processCount & " running processes." buttons {"OK"} default button "OK" with icon note
        
    on error errorMessage
        display dialog "⚠️ AppleScript Test Failed

Error: " & errorMessage & "

You may need to grant additional permissions when OmniTask requests them during use." buttons {"OK"} default button "OK" with icon caution
    end try
end testAppleScriptExecution