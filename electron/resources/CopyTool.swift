import Cocoa
import Carbon
import ApplicationServices

// Check if the application has Accessibility permission
func checkAccessibilityPermission() -> Bool {
    let checkOptPrompt = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as NSString
    let options = [checkOptPrompt: false] // Set to false to prevent automatic prompt
    return AXIsProcessTrustedWithOptions(options as CFDictionary)
}

// Request Accessibility permission (will show system dialog)
func requestAccessibilityPermission() -> Bool {
    let checkOptPrompt = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as NSString
    let options = [checkOptPrompt: true] // Set to true to show system dialog
    return AXIsProcessTrustedWithOptions(options as CFDictionary)
}

// Get the frontmost application's process ID
func getFrontmostApplication() -> (pid: pid_t, name: String)? {
    print("DEBUG: Getting frontmost application")
    
    // Try to get more accurate information about focused application using CGWindowListCopyWindowInfo
    let windowList = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]]
    
    var frontmostApp: (pid: pid_t, name: String)? = nil
    
    if let windowList = windowList {
        // Find the frontmost window (should be at the beginning of the list)
        for window in windowList {
            if let ownerName = window[kCGWindowOwnerName as String] as? String,
               let layer = window[kCGWindowLayer as String] as? Int,
               layer == 0, // Layer 0 is usually the frontmost window
               let pidNumber = window[kCGWindowOwnerPID as String] as? Int {
                
                // We found the frontmost window
                print("DEBUG: Found frontmost window - Owner: \(ownerName), PID: \(pidNumber)")
                
                // Special handling for known apps
                if ownerName.contains("Code") || ownerName.contains("Visual Studio Code") || ownerName == "Electron" {
                    print("DEBUG: VS Code/Electron detected via window list, using special handling")
                    frontmostApp = (pid_t(pidNumber), ownerName)
                    break
                } else if ownerName == "Notion" {
                    print("DEBUG: Notion detected via window list")
                    frontmostApp = (pid_t(pidNumber), ownerName)
                    break
                } else if ownerName == "Slack" {
                    print("DEBUG: Slack detected via window list")
                    frontmostApp = (pid_t(pidNumber), ownerName)
                    break
                } else {
                    // Any other app
                    frontmostApp = (pid_t(pidNumber), ownerName)
                    break
                }
            }
        }
    }
    
    // Fallback to NSWorkspace if window list didn't work
    if frontmostApp == nil, let app = NSWorkspace.shared.frontmostApplication {
        let appName = app.localizedName ?? "unknown"
        print("DEBUG: Frontmost app via NSWorkspace: \(appName), PID: \(app.processIdentifier)")
        
        // For some applications we need special handling
        if appName.contains("Code") || appName.contains("Visual Studio Code") || appName == "Electron" {
            print("DEBUG: VS Code/Electron detected via NSWorkspace, using special handling")
        } else if appName == "Notion" {
            print("DEBUG: Notion detected via NSWorkspace")
        } else if appName == "Slack" {
            print("DEBUG: Slack detected via NSWorkspace")
        }
        
        frontmostApp = (app.processIdentifier, appName)
    }
    
    if let app = frontmostApp {
        return app
    }
    
    print("DEBUG: Could not get frontmost application")
    return nil
}

// Get AXUIElement for a specific application
func getApplicationElement(pid: pid_t) -> AXUIElement {
    print("DEBUG: Creating application AXUIElement for pid: \(pid)")
    return AXUIElementCreateApplication(pid)
}

// Chrome-specific selection handling
func handleChromeSelection(_ appElement: AXUIElement) -> String {
    print("DEBUG: Handling Chrome selection")
    
    // Get the focused window
    var focusedWindow: AnyObject?
    let focusedWinResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXFocusedWindowAttribute as CFString,
        &focusedWindow
    )
    
    if focusedWinResult != .success {
        // Try main window instead
        var mainWindow: AnyObject?
        let mainWinResult = AXUIElementCopyAttributeValue(
            appElement,
            kAXMainWindowAttribute as CFString,
            &mainWindow
        )
        
        if mainWinResult == .success {
            focusedWindow = mainWindow
        }
    }
    
    guard let window = focusedWindow else {
        return ""
    }
    
    // Look specifically for text with AXSelectedTextAttribute
    var selectedText = findExplicitChromeSelection(window as! AXUIElement)
    if !selectedText.isEmpty {
        return selectedText
    }
    
    print("DEBUG: No explicit Chrome selection found")
    return ""
}

// Find explicit Chrome selections
func findExplicitChromeSelection(_ element: AXUIElement) -> String {
    // Check for direct selection
    var selectedText: AnyObject?
    let result = AXUIElementCopyAttributeValue(
        element,
        kAXSelectedTextAttribute as CFString,
        &selectedText
    )
    
    if result == .success, let text = selectedText as? String, !text.isEmpty {
        print("DEBUG: Found explicit Chrome selection")
        return text
    }
    
    // Check children but ONLY look for explicit selections
    var children: AnyObject?
    let childResult = AXUIElementCopyAttributeValue(
        element,
        kAXChildrenAttribute as CFString,
        &children
    )
    
    if childResult == .success, let childArray = children as? [AXUIElement] {
        for child in childArray {
            let childSelection = findExplicitChromeSelection(child)
            if !childSelection.isEmpty {
                return childSelection
            }
        }
    }
    
    return ""
}

// Terminal-specific selection handling
func handleTerminalSelection(_ appElement: AXUIElement) -> String {
    print("DEBUG: Handling Terminal selection")
    
    // Get the focused element and check its value
    var focusedElement: AnyObject?
    let focusedResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXFocusedUIElementAttribute as CFString,
        &focusedElement
    )
    
    if focusedResult == .success {
        let element = focusedElement as! AXUIElement
        // Check role
        var role: AnyObject?
        _ = AXUIElementCopyAttributeValue(
            element,
            kAXRoleAttribute as CFString,
            &role
        )
        
        let roleStr = role as? String ?? "unknown"
        
        // First try getting explicit selection
        var selectedText: AnyObject?
        let selResult = AXUIElementCopyAttributeValue(
            element,
            kAXSelectedTextAttribute as CFString,
            &selectedText
        )
        
        if selResult == .success, let text = selectedText as? String, !text.isEmpty {
            print("DEBUG: Found explicit Terminal selection")
            return text
        }
        
        // If no explicit selection, check if there's value content
        if roleStr == "AXTextArea" {
            var value: AnyObject?
            let valueResult = AXUIElementCopyAttributeValue(
                element,
                kAXValueAttribute as CFString,
                &value
            )
            
            if valueResult == .success, let text = value as? String, !text.isEmpty {
                // Check if content looks like Terminal command line or output
                if text.count < 1000 {
                    // Filter out common terminal prompts and status indicators
                    if text == "⌥⌘1" || text == "⌥⌘3" || text == "⌥⌘2" || text.contains("$") || text.contains("%") {
                        print("DEBUG: Filtered out terminal prompt/status")
                        return "NO_SELECTION" // Return NO_SELECTION directly instead of FILTERED_OUT
                    }
                    
                    // If content is small enough and doesn't look like a prompt, it might be a selection
                    print("DEBUG: Found potential Terminal selection: \(text)")
                    return text
                }
            }
        }
    }
    
    // If here, check for explicit selection throughout
    let result = getStrictSelectedText(appElement)
    if !result.isEmpty {
        return result
    }
    
    return ""
}

// Messenger-specific selection handling
func handleMessengerSelection(_ appElement: AXUIElement) -> String {
    print("DEBUG: Handling Messenger selection")
    
    // First try to get any explicit selection
    var explicitly_selected = ""
    
    // Try focused element
    var focusedElement: AnyObject?
    let focusedResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXFocusedUIElementAttribute as CFString,
        &focusedElement
    )
    
    if focusedResult == .success {
        let element = focusedElement as! AXUIElement
        var selectedText: AnyObject?
        let selResult = AXUIElementCopyAttributeValue(
            element,
            kAXSelectedTextAttribute as CFString,
            &selectedText
        )
        
        if selResult == .success, let text = selectedText as? String, !text.isEmpty {
            explicitly_selected = text
        }
    }
    
    // If we found an explicit selection, use it
    if !explicitly_selected.isEmpty {
        return explicitly_selected
    }
    
    // Now let's search for text elements carefully, but filter out UI elements
    var mainWindow: AnyObject?
    let mainWinResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXMainWindowAttribute as CFString,
        &mainWindow
    )
    
    if mainWinResult == .success {
        let window = mainWindow as! AXUIElement
        // Function to recursively check for text but filter UI labels
        func findMessengerText(_ element: AXUIElement, depth: Int = 0) -> String {
            if depth > 3 { // Limit recursion
                return ""
            }
            
            // Check role
            var role: AnyObject?
            _ = AXUIElementCopyAttributeValue(
                element,
                kAXRoleAttribute as CFString,
                &role
            )
            
            let roleStr = role as? String ?? "unknown"
            
            // Check for value
            var value: AnyObject?
            let valueResult = AXUIElementCopyAttributeValue(
                element,
                kAXValueAttribute as CFString,
                &value
            )
            
            if valueResult == .success, let text = value as? String, !text.isEmpty {
                // Filter out UI element texts
                if text == "Chats" || text.contains("Messages") || text.count < 3 {
                    return ""
                }
                
                // Check if this looks like a legitimate message
                if text.count > 5 && text.count < 1000 {
                    print("DEBUG: Found Messenger text: \(text)")
                    return text
                }
            }
            
            // Check children
            var children: AnyObject?
            let childResult = AXUIElementCopyAttributeValue(
                element,
                kAXChildrenAttribute as CFString,
                &children
            )
            
            if childResult == .success, let childArray = children as? [AXUIElement] {
                for child in childArray {
                    let childText = findMessengerText(child, depth: depth + 1)
                    if !childText.isEmpty {
                        return childText
                    }
                }
            }
            
            return ""
        }
        
        let messengerText = findMessengerText(window)
        if !messengerText.isEmpty {
            return messengerText
        }
    }
    
    // If we get here, check for any selected static text as a last resort
    let staticResult = findStaticTextContent(appElement)
    
    // Filter out UI elements
    if staticResult == "Chats" {
        return "NO_SELECTION"  // Return NO_SELECTION directly instead of FILTERED_OUT
    }
    
    return staticResult
}

// Helper function to find static text content
func findStaticTextContent(_ element: AXUIElement) -> String {
    var children: AnyObject?
    let childResult = AXUIElementCopyAttributeValue(
        element,
        kAXChildrenAttribute as CFString,
        &children
    )
    
    if childResult == .success, let childArray = children as? [AXUIElement] {
        for child in childArray {
            // Check role
            var role: AnyObject?
            _ = AXUIElementCopyAttributeValue(
                child,
                kAXRoleAttribute as CFString,
                &role
            )
            
            let roleStr = role as? String ?? "unknown"
            
            if roleStr == "AXStaticText" {
                var value: AnyObject?
                let valueResult = AXUIElementCopyAttributeValue(
                    child,
                    kAXValueAttribute as CFString,
                    &value
                )
                
                if valueResult == .success, let text = value as? String, !text.isEmpty {
                    // Only return reasonably sized content
                    if text.count > 5 && text.count < 1000 {
                        return text
                    }
                }
            }
            
            // Recursively check children
            let childContent = findStaticTextContent(child)
            if !childContent.isEmpty {
                return childContent
            }
        }
    }
    
    return ""
}

// Get selected text directly using Accessibility API
// Focus only on active window and explicit selection
func getSelectedTextDirectly() -> String {
    print("DEBUG: Starting getSelectedTextDirectly")
    
    // First, try to get the frontmost application
    guard let frontApp = getFrontmostApplication() else {
        print("DEBUG: Could not get frontmost application")
        return "NO_SELECTION"
    }
    
    // Create application element instead of system-wide element
    let appElement = getApplicationElement(pid: frontApp.pid)
    print("DEBUG: Got application element for \(frontApp.name)")
    
    // Special handling for different applications
    
    // Chrome - seems to often have issues with selection detection
    if frontApp.name.contains("Chrome") {
        print("DEBUG: Chrome detected, using special Chrome handling")
        let chromeResult = handleChromeSelection(appElement)
        if !chromeResult.isEmpty {
            return chromeResult
        }
        // If we reached here, no selection in Chrome
        return "NO_SELECTION"
    }
    
    // Terminal - filter out specific terminal outputs that shouldn't be treated as selections
    if frontApp.name.contains("Terminal") || frontApp.name == "iTerm2" {
        print("DEBUG: Terminal app detected, using special handling")
        let terminalResult = handleTerminalSelection(appElement)
        // Since we now return NO_SELECTION directly for filtered prompts
        if !terminalResult.isEmpty {
            return terminalResult
        }
    }
    
    // Messenger - filter out UI elements that shouldn't be treated as selections
    if frontApp.name.contains("Messenger") {
        print("DEBUG: Messenger app detected, using special handling")
        let messengerResult = handleMessengerSelection(appElement)
        // We now return NO_SELECTION directly within the handler
        if !messengerResult.isEmpty {
            return messengerResult
        }
    }
    
    // VS Code or Electron
    if frontApp.name.contains("Code") || frontApp.name.contains("Visual Studio Code") || frontApp.name == "Electron" {
        // For VS Code, we need special handling to detect real selections
        print("DEBUG: VS Code detected, using special handling")
        let vscodeResult = findSelectionInVSCode(appElement)
        if !vscodeResult.isEmpty {
            return vscodeResult
        }
    }
    
    // Notion
    if frontApp.name == "Notion" {
        let notionResult = findSelectionInNotion(appElement)
        if !notionResult.isEmpty {
            return notionResult
        }
    }
    
    // Slack
    if frontApp.name == "Slack" {
        // For Slack, we might use a similar approach as Notion
        let slackResult = findSelectionInNotion(appElement) // reuse the same function for now
        if !slackResult.isEmpty {
            return slackResult
        }
    }
    
    // Use our strict selection approach that only checks active window and focused elements
    print("DEBUG: Using strict selection detection focusing on active window")
    let strictResult = getStrictSelectedText(appElement)
    if !strictResult.isEmpty {
        return strictResult
    }
    
    print("DEBUG: No selection found with strict criteria")
    return "NO_SELECTION"
}

// Function to find selection in VS Code
func findSelectionInVSCode(_ appElement: AXUIElement) -> String {
    print("DEBUG: Using VS Code specific selection finding")
    
    // Flag to track if we've found a "cursor is on line but no selection" case
    var foundLineWithCursor = false
    var lineWithCursorText = ""
    
    // Try to get focused element first - often the editor with selection
    var focusedElement: AnyObject?
    let focusedResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXFocusedUIElementAttribute as CFString,
        &focusedElement
    )
    
    print("DEBUG: VS Code focused element result: \(focusedResult)")
    
    if focusedResult == .success {
        // Try getting selected text from focused element
        var selectedText: AnyObject?
        let selResult = AXUIElementCopyAttributeValue(
            focusedElement as! AXUIElement,
            kAXSelectedTextAttribute as CFString,
            &selectedText
        )
        
        if selResult == .success, let text = selectedText as? String, !text.isEmpty {
            print("DEBUG: Found VS Code selected text in focused element")
            return text
        }
        
        // Get role of focused element
        var role: AnyObject?
        _ = AXUIElementCopyAttributeValue(
            focusedElement as! AXUIElement,
            kAXRoleAttribute as CFString,
            &role
        )
        
        print("DEBUG: VS Code focused element role: \(role as? String ?? "unknown")")
        
        // Try getting value which might contain the selected text
        var value: AnyObject?
        let valueResult = AXUIElementCopyAttributeValue(
            focusedElement as! AXUIElement,
            kAXValueAttribute as CFString,
            &value
        )
        
        if valueResult == .success, let fullText = value as? String, !fullText.isEmpty {
            print("DEBUG: VS Code focused element has text content, length: \(fullText.count)")
            
            // Check if we can get the selection range
            var selectedRange: AnyObject?
            let rangeResult = AXUIElementCopyAttributeValue(
                focusedElement as! AXUIElement,
                kAXSelectedTextRangeAttribute as CFString,
                &selectedRange
            )
            
            if rangeResult == .success, let range = selectedRange as? CFRange {
                print("DEBUG: VS Code selection range - location: \(range.location), length: \(range.length)")
                
                if range.length > 0 && range.location >= 0 && fullText.count >= range.location + range.length {
                    // This is a real selection with non-zero length
                    let startIndex = fullText.index(fullText.startIndex, offsetBy: range.location)
                    let endIndex = fullText.index(startIndex, offsetBy: range.length)
                    let extractedText = String(fullText[startIndex..<endIndex])
                    
                    if !extractedText.isEmpty {
                        print("DEBUG: Extracted VS Code text using range: \(extractedText)")
                        return extractedText
                    }
                } else if range.length == 0 {
                    // This is just a cursor position (length 0), 
                    // We'll extract the current line for reference, but won't return it yet
                    // We need to find the start and end of the current line
                    
                    // First, find the beginning of the line (previous newline or start of text)
                    var lineStart = range.location
                    while lineStart > 0 {
                        let index = fullText.index(fullText.startIndex, offsetBy: lineStart - 1)
                        if fullText[index] == "\n" {
                            break // Found the previous newline
                        }
                        lineStart -= 1
                    }
                    
                    // Then, find the end of the line (next newline or end of text)
                    var lineEnd = range.location
                    while lineEnd < fullText.count {
                        let index = fullText.index(fullText.startIndex, offsetBy: lineEnd)
                        if fullText[index] == "\n" {
                            break // Found the next newline
                        }
                        lineEnd += 1
                    }
                    
                    // Extract the current line
                    let startIndex = fullText.index(fullText.startIndex, offsetBy: lineStart)
                    let endIndex = fullText.index(fullText.startIndex, offsetBy: lineEnd)
                    let currentLine = String(fullText[startIndex..<endIndex])
                    
                    if !currentLine.isEmpty {
                        print("DEBUG: Found current line in VS Code: \(currentLine)")
                        // Remember this, but don't return it yet - we're looking for a real selection
                        foundLineWithCursor = true
                        lineWithCursorText = currentLine
                    }
                }
            }
        }
    }
    
    // Try a more comprehensive search through all windows and elements
    var windows: AnyObject?
    let windowsResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXWindowsAttribute as CFString,
        &windows
    )
    
    print("DEBUG: VS Code windows result: \(windowsResult)")
    
    if windowsResult == .success, let windowArray = windows as? [AXUIElement] {
        print("DEBUG: Found \(windowArray.count) VS Code windows")
        
        for window in windowArray {
            // Try to find the title of the window to help debugging
            var title: AnyObject?
            _ = AXUIElementCopyAttributeValue(
                window,
                kAXTitleAttribute as CFString,
                &title
            )
            print("DEBUG: VS Code window title: \(title as? String ?? "unknown")")
            
            // First try finding elements with specific roles that might contain editor
            let roles = ["AXTextArea", "AXTextField", "AXWebArea", "AXScrollArea", "AXGroup", "AXSplitGroup"]
            
            for role in roles {
                print("DEBUG: Searching for VS Code elements with role: \(role)")
                let result = findElementsByRole(window, role: role)
                print("DEBUG: Found \(result.count) elements with role \(role)")
                
                for element in result {
                    // Try getting selected text from this element
                    var selectedText: AnyObject?
                    let selResult = AXUIElementCopyAttributeValue(
                        element,
                        kAXSelectedTextAttribute as CFString,
                        &selectedText
                    )
                    
                    if selResult == .success, let text = selectedText as? String, !text.isEmpty {
                        print("DEBUG: Found VS Code selected text in \(role)")
                        return text
                    }
                    
                    // Try getting value which might contain selection
                    var value: AnyObject?
                    let valueResult = AXUIElementCopyAttributeValue(
                        element,
                        kAXValueAttribute as CFString,
                        &value
                    )
                    
                    if valueResult == .success, let fullText = value as? String, !fullText.isEmpty {
                        print("DEBUG: Found VS Code element with text content, length: \(fullText.count)")
                        
                        // VS Code: Try to check if this has a description indicating it's an editor
                        var description: AnyObject?
                        _ = AXUIElementCopyAttributeValue(
                            element,
                            kAXDescriptionAttribute as CFString,
                            &description
                        )
                        
                        if let desc = description as? String, desc.contains("editor") {
                            print("DEBUG: Found VS Code editor element: \(desc)")
                            
                            // Try to get selection range
                            var selectedRange: AnyObject?
                            let rangeResult = AXUIElementCopyAttributeValue(
                                element,
                                kAXSelectedTextRangeAttribute as CFString,
                                &selectedRange
                            )
                            
                            if rangeResult == .success, let range = selectedRange as? CFRange, range.length > 0 {
                                if range.location >= 0 && fullText.count >= range.location + range.length {
                                    let startIndex = fullText.index(fullText.startIndex, offsetBy: range.location)
                                    let endIndex = fullText.index(startIndex, offsetBy: range.length)
                                    let extractedText = String(fullText[startIndex..<endIndex])
                                    
                                    if !extractedText.isEmpty {
                                        print("DEBUG: Extracted VS Code text using range")
                                        return extractedText
                                    }
                                }
                            }
                        }
                    }
                    
                    // Check if this element has any focused subelements
                    var focused: AnyObject?
                    let focusedResult = AXUIElementCopyAttributeValue(
                        element,
                        kAXFocusedUIElementAttribute as CFString,
                        &focused
                    )
                    
                    if focusedResult == .success {
                        print("DEBUG: Found focused element within VS Code \(role)")
                        let focusedText = findSelectionInElement(focused as! AXUIElement)
                        if !focusedText.isEmpty && focusedText != "NO_SELECTION" {
                            return focusedText
                        }
                    }
                }
            }
        }
    }
    
    // Try main window as a last resort
    var mainWindow: AnyObject?
    let mainWindowResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXMainWindowAttribute as CFString,
        &mainWindow
    )
    
    if mainWindowResult == .success {
        print("DEBUG: Checking VS Code main window")
        // Try a deep recursive search through all elements
        let mainWindowText = findSelectionRecursively(mainWindow as! AXUIElement)
        if !mainWindowText.isEmpty {
            return mainWindowText
        }
    }
    
    // Last resort: If we found that the cursor was on a line but there's no actual selection,
    // we don't want to return the whole line because that's not what the user intended to select.
    // VS Code will copy the whole line when you press Cmd+C with no selection, but that's not what
    // we want for our tool.
    if foundLineWithCursor {
        print("DEBUG: Found cursor on line but no actual selection")
        return "NO_SELECTION" // Return "NO_SELECTION" instead of the line content
    }
    
    return ""
}

// Helper function for deep recursive search
func findSelectionRecursively(_ element: AXUIElement) -> String {
    // Try getting selected text directly
    var selectedText: AnyObject?
    let selResult = AXUIElementCopyAttributeValue(
        element,
        kAXSelectedTextAttribute as CFString,
        &selectedText
    )
    
    if selResult == .success, let text = selectedText as? String, !text.isEmpty {
        print("DEBUG: Found selected text in recursive search")
        return text
    }
    
    // Get children and check recursively
    var children: AnyObject?
    let childrenResult = AXUIElementCopyAttributeValue(
        element,
        kAXChildrenAttribute as CFString,
        &children
    )
    
    if childrenResult == .success, let childArray = children as? [AXUIElement] {
        for child in childArray {
            let childText = findSelectionRecursively(child)
            if !childText.isEmpty {
                return childText
            }
        }
    }
    
    return ""
}

// Function to find selection in Notion
func findSelectionInNotion(_ appElement: AXUIElement) -> String {
    print("DEBUG: Using Notion specific selection finding")
    
    // In Notion, the selected text might be in a focused editing area
    var focused: AnyObject?
    let focusedResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXFocusedUIElementAttribute as CFString,
        &focused
    )
    
    if focusedResult == .success, let focusedElement = focused {
        print("DEBUG: Found focused element in Notion")
        
        // Try direct selection
        var selectedText: AnyObject?
        let selResult = AXUIElementCopyAttributeValue(
            focusedElement as! AXUIElement,
            kAXSelectedTextAttribute as CFString,
            &selectedText
        )
        
        if selResult == .success, let text = selectedText as? String, !text.isEmpty {
            return text
        }
        
        // Try value
        var value: AnyObject?
        let valueResult = AXUIElementCopyAttributeValue(
            focusedElement as! AXUIElement,
            kAXValueAttribute as CFString,
            &value
        )
        
        if valueResult == .success, let fullText = value as? String, !fullText.isEmpty {
            print("DEBUG: Found Notion text content")
            // For debugging, might return full content
            // return fullText
        }
    }
    
    // Try all text areas specifically
    let textAreas = findElementsByRole(appElement, role: "AXTextArea")
    for textArea in textAreas {
        var selectedText: AnyObject?
        let selResult = AXUIElementCopyAttributeValue(
            textArea,
            kAXSelectedTextAttribute as CFString,
            &selectedText
        )
        
        if selResult == .success, let text = selectedText as? String, !text.isEmpty {
            print("DEBUG: Found Notion selected text in text area")
            return text
        }
    }
    
    return ""
}

// Helper function to find elements by role
func findElementsByRole(_ element: AXUIElement, role: String) -> [AXUIElement] {
    var result = [AXUIElement]()
    
    // Check if this element has the target role
    var roleValue: AnyObject?
    let roleResult = AXUIElementCopyAttributeValue(
        element,
        kAXRoleAttribute as CFString,
        &roleValue
    )
    
    if roleResult == .success, let elementRole = roleValue as? String, elementRole == role {
        result.append(element)
    }
    
    // Get children and check them recursively
    var children: AnyObject?
    let childrenResult = AXUIElementCopyAttributeValue(
        element,
        kAXChildrenAttribute as CFString,
        &children
    )
    
    if childrenResult == .success, let childArray = children as? [AXUIElement] {
        for child in childArray {
            result.append(contentsOf: findElementsByRole(child, role: role))
        }
    }
    
    return result
}

// Function to get selected text with strict criteria
func getStrictSelectedText(_ appElement: AXUIElement) -> String {
    // Get the active window
    var activeWindow: AXUIElement? = nil
    
    // First try to get the focused window
    var focusedWin: AnyObject?
    let focusedWinResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXFocusedWindowAttribute as CFString,
        &focusedWin
    )
    
    if focusedWinResult == .success, let win = focusedWin {
        activeWindow = win as! AXUIElement // Force cast as AXUIElement
        print("DEBUG: Found focused window")
    } else {
        // Fallback to main window if focused window isn't available
        var mainWin: AnyObject?
        let mainWinResult = AXUIElementCopyAttributeValue(
            appElement,
            kAXMainWindowAttribute as CFString, 
            &mainWin
        )
        
        if mainWinResult == .success, let win = mainWin {
            activeWindow = win as! AXUIElement // Force cast as AXUIElement
            print("DEBUG: Using main window")
        }
    }
    
    // If no active window found, try to get the focused element directly
    if activeWindow == nil {
        var focusedElement: AnyObject?
        let focusedResult = AXUIElementCopyAttributeValue(
            appElement,
            kAXFocusedUIElementAttribute as CFString,
            &focusedElement
        )
        
        if focusedResult == .success, let focused = focusedElement {
            print("DEBUG: Found focused element, looking for selection")
            let selectedText = findStrictSelectionInElement(focused as! AXUIElement)
            if !selectedText.isEmpty {
                return selectedText
            }
        }
        
        // Try system-wide focus as a last resort
        let systemWideElement = AXUIElementCreateSystemWide()
        let systemFocusedResult = AXUIElementCopyAttributeValue(
            systemWideElement,
            kAXFocusedUIElementAttribute as CFString,
            &focusedElement
        )
        
        if systemFocusedResult == .success, let focused = focusedElement {
            print("DEBUG: Found system-wide focused element, looking for selection")
            let selectedText = findStrictSelectionInElement(focused as! AXUIElement)
            if !selectedText.isEmpty {
                return selectedText
            }
        }
        
        return "NO_SELECTION"
    }
    
    // If we have an active window, search for selection within it
    guard let window = activeWindow else {
        return "NO_SELECTION"
    }
    
    // Look for focused element within the window
    var focusedElement: AnyObject?
    let focusedResult = AXUIElementCopyAttributeValue(
        window,
        kAXFocusedUIElementAttribute as CFString,
        &focusedElement
    )
    
    if focusedResult == .success, let focused = focusedElement {
        print("DEBUG: Found focused element within window, looking for selection")
        let selectedText = findStrictSelectionInElement(focused as! AXUIElement)
        if !selectedText.isEmpty {
            return selectedText
        }
    }
    
    // Search the window more broadly, but still strictly
    let windowSelection = findStrictSelectionInElement(window)
    if !windowSelection.isEmpty {
        return windowSelection
    }
    
    return "NO_SELECTION"
}

// This is a modified version that still works with common apps
func findStrictSelectionInElement(_ element: AXUIElement) -> String {
    // Try to get selected text attribute directly
    var selectedText: AnyObject?
    let result = AXUIElementCopyAttributeValue(
        element,
        kAXSelectedTextAttribute as CFString,
        &selectedText
    )
    
    if result == .success, let text = selectedText as? String, !text.isEmpty {
        print("DEBUG: Found selected text attribute")
        return text
    }
    
    // Get element role for better debugging and special handling
    var role: AnyObject?
    let roleResult = AXUIElementCopyAttributeValue(
        element,
        kAXRoleAttribute as CFString,
        &role
    )
    
    let roleStr = role as? String ?? "unknown"
    print("DEBUG: Element role: \(roleStr)")
    
    // Try value + selected range approach
    var value: AnyObject?
    let valueResult = AXUIElementCopyAttributeValue(
        element,
        kAXValueAttribute as CFString,
        &value
    )
    
    var selectedRange: AnyObject?
    let rangeResult = AXUIElementCopyAttributeValue(
        element,
        kAXSelectedTextRangeAttribute as CFString,
        &selectedRange
    )
    
    if valueResult == .success && rangeResult == .success,
       let fullText = value as? String,
       let range = selectedRange as? CFRange,
       range.length > 0 { // IMPORTANT: Only consider non-zero ranges
        
        if range.location >= 0 && fullText.count >= range.location + range.length {
            let startIndex = fullText.index(fullText.startIndex, offsetBy: range.location)
            let endIndex = fullText.index(startIndex, offsetBy: range.length)
            let extractedText = String(fullText[startIndex..<endIndex])
            
            if !extractedText.isEmpty {
                print("DEBUG: Extracted text using range")
                return extractedText
            }
        }
    }
    
    // Special case for common text elements in active window
    // Some apps like Terminal, Safari, etc. don't properly report selections
    if (roleStr.contains("Text") || roleStr == "AXTextArea" || roleStr == "AXTextField") && 
       valueResult == .success && 
       selectedRange == nil {
        
        // This is a special case for Terminal, Safari, etc.
        if let fullText = value as? String, !fullText.isEmpty {
            // Check if there are any signs this might be a selection
            // For Terminal, it often just contains the selected text
            if fullText.count < 1000 { // Reasonable limit for text selections
                print("DEBUG: Found potential selection in \(roleStr), length: \(fullText.count)")
                return fullText
            }
        }
    }
    
    // Try the focused element - quite often this is where the selection is
    var focusedElement: AnyObject?
    let focusedResult = AXUIElementCopyAttributeValue(
        element, 
        kAXFocusedUIElementAttribute as CFString,
        &focusedElement
    )
    
    if focusedResult == .success, let focused = focusedElement {
        print("DEBUG: Found focused subelement")
        let focusedText = findStrictSelectionInElement(focused as! AXUIElement)
        if !focusedText.isEmpty {
            return focusedText
        }
    }
    
    // Now try direct children, but don't go too deep
    var children: AnyObject?
    let childResult = AXUIElementCopyAttributeValue(
        element,
        kAXChildrenAttribute as CFString,
        &children
    )
    
    if childResult == .success, let childArray = children as? [AXUIElement] {
        print("DEBUG: Found \(childArray.count) children")
        
        for child in childArray {
            // Check for direct selection on each child
            var childSelectedText: AnyObject?
            let childSelResult = AXUIElementCopyAttributeValue(
                child,
                kAXSelectedTextAttribute as CFString,
                &childSelectedText
            )
            
            if childSelResult == .success, let text = childSelectedText as? String, !text.isEmpty {
                print("DEBUG: Found selected text in child")
                return text
            }
            
            // Check role of child
            var childRole: AnyObject?
            let childRoleResult = AXUIElementCopyAttributeValue(
                child,
                kAXRoleAttribute as CFString,
                &childRole
            )
            
            let childRoleStr = childRole as? String ?? "unknown"
            
            // Special case for static text elements in common apps
            if childRoleStr == "AXStaticText" {
                var childValue: AnyObject?
                let childValueResult = AXUIElementCopyAttributeValue(
                    child,
                    kAXValueAttribute as CFString,
                    &childValue
                )
                
                if childValueResult == .success, let text = childValue as? String, !text.isEmpty {
                    if text.count < 1000 { // Reasonable size for a selection
                        print("DEBUG: Found potential selection in static text: \(text)")
                        return text
                    }
                }
            }
            
            // Check for selection range
            var childValue: AnyObject?
            let childValueResult = AXUIElementCopyAttributeValue(
                child,
                kAXValueAttribute as CFString,
                &childValue
            )
            
            var childRange: AnyObject?
            let childRangeResult = AXUIElementCopyAttributeValue(
                child,
                kAXSelectedTextRangeAttribute as CFString,
                &childRange
            )
            
            if childValueResult == .success && childRangeResult == .success,
               let fullText = childValue as? String,
               let range = childRange as? CFRange,
               range.length > 0 {
                
                if range.location >= 0 && fullText.count >= range.location + range.length {
                    let startIndex = fullText.index(fullText.startIndex, offsetBy: range.location)
                    let endIndex = fullText.index(startIndex, offsetBy: range.length)
                    let extractedText = String(fullText[startIndex..<endIndex])
                    
                    if !extractedText.isEmpty {
                        print("DEBUG: Extracted text from child using range")
                        return extractedText
                    }
                }
            }
            
            // For AXTextArea elements, try one level deeper, but no more
            if childRoleStr == "AXTextArea" || childRoleStr.contains("Text") {
                var grandchildren: AnyObject?
                let grandchildResult = AXUIElementCopyAttributeValue(
                    child,
                    kAXChildrenAttribute as CFString,
                    &grandchildren
                )
                
                if grandchildResult == .success, let gcArray = grandchildren as? [AXUIElement] {
                    for grandchild in gcArray {
                        var gcSelectedText: AnyObject?
                        let gcSelResult = AXUIElementCopyAttributeValue(
                            grandchild,
                            kAXSelectedTextAttribute as CFString,
                            &gcSelectedText
                        )
                        
                        if gcSelResult == .success, let text = gcSelectedText as? String, !text.isEmpty {
                            print("DEBUG: Found selected text in grandchild")
                            return text
                        }
                    }
                }
            }
        }
    }
    
    return ""
}

// Function to check an element for selected text (LEGACY FUNCTION - kept for compatibility)
func findSelectionInElement(_ element: AXUIElement) -> String {
    print("DEBUG: Checking element for selection")
    
    // First try direct selection on this element
    var selectedText: AnyObject?
    let result = AXUIElementCopyAttributeValue(
        element,
        kAXSelectedTextAttribute as CFString,
        &selectedText
    )
    
    if result == .success, let text = selectedText as? String, !text.isEmpty {
        print("DEBUG: Found selected text in element")
        return text
    }
    
    // Try value and range approach
    var value: AnyObject?
    let valueResult = AXUIElementCopyAttributeValue(
        element,
        kAXValueAttribute as CFString,
        &value
    )
    
    var selectedRange: AnyObject?
    let rangeResult = AXUIElementCopyAttributeValue(
        element,
        kAXSelectedTextRangeAttribute as CFString,
        &selectedRange
    )
    
    if valueResult == .success && rangeResult == .success,
       let fullText = value as? String,
       let range = selectedRange as? CFRange,
       range.length > 0 {
        let startIndex = fullText.index(fullText.startIndex, offsetBy: range.location)
        let endIndex = fullText.index(startIndex, offsetBy: range.length)
        let extractedText = String(fullText[startIndex..<endIndex])
        if !extractedText.isEmpty {
            print("DEBUG: Extracted text using range")
            return extractedText
        }
    }
    
    // Try focused element within this element
    var focusedElement: AnyObject?
    let focusedResult = AXUIElementCopyAttributeValue(
        element, 
        kAXFocusedUIElementAttribute as CFString,
        &focusedElement
    )
    
    if focusedResult == .success {
        print("DEBUG: Found focused element within, checking it")
        let focusedText = findSelectionInElement(focusedElement as! AXUIElement)
        if !focusedText.isEmpty && focusedText != "NO_SELECTION" {
            return focusedText
        }
    }
    
    // If none of the above worked, check children
    return findSelectionInChildren(element)
}

// Recursive function to look for selection in child elements
func findSelectionInChildren(_ element: AXUIElement) -> String {
    // Try to get children
    var children: AnyObject?
    let childResult = AXUIElementCopyAttributeValue(
        element,
        kAXChildrenAttribute as CFString,
        &children
    )
    
    if childResult == .success, let childArray = children as? [AXUIElement] {
        print("DEBUG: Found \(childArray.count) children")
        
        // First, check each child for selection
        for child in childArray {
            // Check direct selection on child
            let childSelection = findSelectionInElement(child)
            if !childSelection.isEmpty && childSelection != "NO_SELECTION" {
                return childSelection
            }
        }
    }
    
    // Try specific element types that might contain text
    // Look for common roles and try to find text in them
    var role: AnyObject?
    _ = AXUIElementCopyAttributeValue(
        element,
        kAXRoleAttribute as CFString,
        &role
    )
    
    if let roleStr = role as? String {
        print("DEBUG: Element role: \(roleStr)")
        
        // Only check for selected text, don't return the entire content
        // We previously returned the entire text content, which was causing false positives
        if roleStr.contains("Text") || roleStr == "AXTextArea" || roleStr == "AXTextField" {
            var value: AnyObject?
            let valueResult = AXUIElementCopyAttributeValue(
                element,
                kAXValueAttribute as CFString,
                &value
            )
            
            // Only log the text content for debugging, but don't return it
            if valueResult == .success, let text = value as? String, !text.isEmpty {
                print("DEBUG: Found text content in \(roleStr), length: \(text.count)")
                
                // Check if there's any indication this is actually selected text
                var selectedRange: AnyObject?
                let rangeResult = AXUIElementCopyAttributeValue(
                    element,
                    kAXSelectedTextRangeAttribute as CFString,
                    &selectedRange
                )
                
                // Only return text if we have a valid selection range
                if rangeResult == .success, let range = selectedRange as? CFRange, range.length > 0 {
                    if range.location >= 0 && text.count >= range.location + range.length {
                        let startIndex = text.index(text.startIndex, offsetBy: range.location)
                        let endIndex = text.index(startIndex, offsetBy: range.length)
                        let extractedText = String(text[startIndex..<endIndex])
                        
                        if !extractedText.isEmpty {
                            print("DEBUG: Extracted selected portion of text")
                            return extractedText
                        }
                    }
                }
                
                // If we don't have a valid selection range, don't return the content
            }
        }
    }
    
    return ""
}

// Function to explicitly handle VS Code using a more direct approach
func handleVSCodeDirectly() -> String {
    print("DEBUG: Using special handling for VS Code")
    
    // VS Code is more challenging with Accessibility API
    // For VS Code, we're going to try a more aggressive approach
    
    // First, try to find VS Code in the application list
    let workspace = NSWorkspace.shared
    let runningApps = workspace.runningApplications
    
    for app in runningApps {
        // Check if the app is VS Code or Electron (which could be VS Code)
        if let appName = app.localizedName, (appName.contains("Code") || appName.contains("Visual Studio Code") || appName == "Electron") {
            print("DEBUG: Found VS Code/Electron in running applications: \(appName)")
            
            let vsCodeElement = getApplicationElement(pid: app.processIdentifier)
            
            // First try using our standard VS Code finder
            let vsCodeResult = findSelectionInVSCode(vsCodeElement)
            if !vsCodeResult.isEmpty {
                return vsCodeResult
            }
            
            // If that didn't work, try an even more aggressive approach
            print("DEBUG: Standard VS Code finder failed, trying deep recursion")
            
            // Try to get all windows
            var windows: AnyObject?
            let windowsResult = AXUIElementCopyAttributeValue(
                vsCodeElement,
                kAXWindowsAttribute as CFString,
                &windows
            )
            
            if windowsResult == .success, let windowArray = windows as? [AXUIElement] {
                print("DEBUG: Deep scan - Found \(windowArray.count) VS Code windows")
                
                for window in windowArray {
                    // Try a deep scan of this window
                    let result = deepScanForText(element: window, maxDepth: 10)
                    if !result.isEmpty {
                        return result
                    }
                }
            }
        }
    }
    
    return "NO_SELECTION"
}

// Function to perform a very deep scan for any text or selection
func deepScanForText(element: AXUIElement, maxDepth: Int) -> String {
    if maxDepth <= 0 {
        return ""
    }
    
    // Try selected text
    var selectedText: AnyObject?
    let selectedResult = AXUIElementCopyAttributeValue(
        element,
        kAXSelectedTextAttribute as CFString,
        &selectedText
    )
    
    if selectedResult == .success, let text = selectedText as? String, !text.isEmpty {
        print("DEBUG: Deep scan found selected text")
        return text
    }
    
    // Try to get value
    var value: AnyObject?
    let valueResult = AXUIElementCopyAttributeValue(
        element,
        kAXValueAttribute as CFString,
        &value
    )
    
    // Check if we have selection range
    if valueResult == .success, let fullText = value as? String, !fullText.isEmpty {
        var selectedRange: AnyObject?
        let rangeResult = AXUIElementCopyAttributeValue(
            element,
            kAXSelectedTextRangeAttribute as CFString,
            &selectedRange
        )
        
        if rangeResult == .success, let range = selectedRange as? CFRange, range.length > 0 {
            if range.location >= 0 && fullText.count >= range.location + range.length {
                let startIndex = fullText.index(fullText.startIndex, offsetBy: range.location)
                let endIndex = fullText.index(startIndex, offsetBy: range.length)
                let extractedText = String(fullText[startIndex..<endIndex])
                
                if !extractedText.isEmpty {
                    print("DEBUG: Deep scan found text using range")
                    return extractedText
                }
            }
        }
    }
    
    // Try role
    var role: AnyObject?
    _ = AXUIElementCopyAttributeValue(
        element,
        kAXRoleAttribute as CFString,
        &role
    )
    
    let roleStr = role as? String ?? "unknown"
    print("DEBUG: Deep scan - element role: \(roleStr)")
    
    // If this is an editor or text related, we DON'T want to return the whole text content
    // Just log for debugging
    if roleStr.contains("Text") || roleStr.contains("Editor") {
        if valueResult == .success, let fullText = value as? String, !fullText.isEmpty {
            print("DEBUG: Deep scan found text in \(roleStr)")
            // We usually don't want to return the full text, just log content size
            print("DEBUG: Text content size: \(fullText.count)")
            // Don't return the whole text - that would be incorrect
        }
    }
    
    // Try children recursively
    var children: AnyObject?
    let childrenResult = AXUIElementCopyAttributeValue(
        element,
        kAXChildrenAttribute as CFString,
        &children
    )
    
    if childrenResult == .success, let childArray = children as? [AXUIElement] {
        print("DEBUG: Deep scan - found \(childArray.count) children")
        
        for child in childArray {
            let childResult = deepScanForText(element: child, maxDepth: maxDepth - 1)
            if !childResult.isEmpty {
                return childResult
            }
        }
    }
    
    return ""
}

// Main function
func main() {
    // Command line arguments handling
    let args = CommandLine.arguments
    var shouldPrompt = false
    var isVSCode = false
    
    // Parse arguments
    for i in 1..<args.count {
        if args[i] == "--prompt" {
            shouldPrompt = true
        } else if args[i] == "--vs-code" {
            isVSCode = true
        }
    }
    
    // Check Accessibility permission
    if !checkAccessibilityPermission() {
        if shouldPrompt {
            // Request permission, which shows system prompt
            print("PERMISSION_NEEDED")
            _ = requestAccessibilityPermission()
            exit(2)
        } else {
            // Don't request permission, just return status code
            print("PERMISSION_NEEDED")
            exit(1)
        }
    }
    
    // Give the system a moment to ensure current app selection is complete
    Thread.sleep(forTimeInterval: 0.1)
    
    // Special handling for VS Code if explicitly requested
    if isVSCode {
        print("DEBUG: VS Code mode explicitly requested")
        let vsCodeText = handleVSCodeDirectly()
        
        if vsCodeText != "NO_SELECTION" {
            print(vsCodeText)
            exit(0)
        } else {
            print("NO_SELECTION")
            exit(3)
        }
        return
    }
    
    // Get selected text directly using Accessibility API with new stricter approach
    let selectedText = getSelectedTextDirectly()
    
    // If we got text, return it
    if selectedText != "NO_SELECTION" {
        print(selectedText)
        exit(0)
    } else {
        // No text was selected
        print("NO_SELECTION")
        exit(3)
    }
}

// Execute main function
main()