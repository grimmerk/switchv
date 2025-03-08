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

// Get selected text directly using Accessibility API
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
    
    // First, check for special case applications
    if frontApp.name.contains("Code") || frontApp.name.contains("Visual Studio Code") {
        let vscodeResult = findSelectionInVSCode(appElement)
        if !vscodeResult.isEmpty {
            return vscodeResult
        }
    }
    
    if frontApp.name == "Notion" {
        let notionResult = findSelectionInNotion(appElement)
        if !notionResult.isEmpty {
            return notionResult
        }
    }
    
    if frontApp.name == "Slack" {
        // For Slack, we might use a similar approach as Notion
        let slackResult = findSelectionInNotion(appElement) // reuse the same function for now
        if !slackResult.isEmpty {
            return slackResult
        }
    }
    
    // Standard approach for most applications
    // Try to get focused element from application
    var focusedElement: AnyObject?
    var focusedResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXFocusedUIElementAttribute as CFString,
        &focusedElement
    )
    
    print("DEBUG: App focused element result: \(focusedResult)")
    
    // If we couldn't get focused element from app, try system-wide as fallback
    if focusedResult != .success {
        print("DEBUG: Falling back to system-wide element")
        let systemWideElement = AXUIElementCreateSystemWide()
        
        focusedResult = AXUIElementCopyAttributeValue(
            systemWideElement,
            kAXFocusedUIElementAttribute as CFString,
            &focusedElement
        )
        
        print("DEBUG: System-wide focused element result: \(focusedResult)")
    }
    
    // If we got a focused element, check it for selection
    if focusedResult == .success {
        print("DEBUG: Found focused element, checking for selection")
        
        // First try to get selected text directly
        var selectedText: AnyObject?
        let result = AXUIElementCopyAttributeValue(
            focusedElement as! AXUIElement,
            kAXSelectedTextAttribute as CFString,
            &selectedText
        )
        
        if result == .success, let text = selectedText as? String, !text.isEmpty {
            print("DEBUG: Found selected text in focused element")
            return text
        }
        
        // Otherwise check the element recursively
        let focusedSelection = findSelectionInElement(focusedElement as! AXUIElement)
        if !focusedSelection.isEmpty && focusedSelection != "NO_SELECTION" {
            return focusedSelection
        }
    }
    
    // If we still couldn't get a selection, try alternative approaches
    print("DEBUG: No selection in focused element, trying app-wide search")
    
    // Try to directly get the selected text from the application
    var appSelectedText: AnyObject?
    let appSelectedResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXSelectedTextAttribute as CFString,
        &appSelectedText
    )
    
    print("DEBUG: App selected text result: \(appSelectedResult)")
    if appSelectedResult == .success, let text = appSelectedText as? String, !text.isEmpty {
        print("DEBUG: Found selected text directly from application")
        return text
    }
    
    // Try to get main window and search from there
    var mainWindow: AnyObject?
    let windowResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXMainWindowAttribute as CFString, 
        &mainWindow
    )
    
    print("DEBUG: Main window result: \(windowResult)")
    if windowResult == .success {
        print("DEBUG: Searching for selection in main window")
        let selectedText = findSelectionInElement(mainWindow as! AXUIElement)
        if !selectedText.isEmpty && selectedText != "NO_SELECTION" {
            return selectedText
        }
    }
    
    // If all else fails, try to get all windows and search each one
    var windows: AnyObject?
    let windowsResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXWindowsAttribute as CFString,
        &windows
    )
    
    print("DEBUG: Windows result: \(windowsResult)")
    if windowsResult == .success, let windowArray = windows as? [AXUIElement] {
        print("DEBUG: Found \(windowArray.count) windows")
        
        for window in windowArray {
            let selectedText = findSelectionInElement(window)
            if !selectedText.isEmpty && selectedText != "NO_SELECTION" {
                return selectedText
            }
        }
    }
    
    print("DEBUG: Could not find selection in any window")
    return "NO_SELECTION"
}

// Function to find selection in VS Code
func findSelectionInVSCode(_ appElement: AXUIElement) -> String {
    print("DEBUG: Using VS Code specific selection finding")
    
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
            
            if rangeResult == .success, let range = selectedRange as? CFRange, range.length > 0 {
                print("DEBUG: VS Code selection range - location: \(range.location), length: \(range.length)")
                
                if range.location >= 0 && fullText.count >= range.location + range.length {
                    let startIndex = fullText.index(fullText.startIndex, offsetBy: range.location)
                    let endIndex = fullText.index(startIndex, offsetBy: range.length)
                    let extractedText = String(fullText[startIndex..<endIndex])
                    
                    if !extractedText.isEmpty {
                        print("DEBUG: Extracted VS Code text using range: \(extractedText)")
                        return extractedText
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

// Function to check an element for selected text
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
        
        // Text fields, text areas, etc. often have these roles
        if roleStr.contains("Text") || roleStr == "AXTextArea" || roleStr == "AXTextField" {
            var value: AnyObject?
            let valueResult = AXUIElementCopyAttributeValue(
                element,
                kAXValueAttribute as CFString,
                &value
            )
            
            if valueResult == .success, let text = value as? String, !text.isEmpty {
                print("DEBUG: Found text in \(roleStr)")
                return text
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
    
    // If this is an editor or text related
    if roleStr.contains("Text") || roleStr.contains("Editor") {
        if valueResult == .success, let fullText = value as? String, !fullText.isEmpty {
            print("DEBUG: Deep scan found text in \(roleStr)")
            // We usually don't want to return the full text, but for debugging print content size
            print("DEBUG: Text content size: \(fullText.count)")
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
    
    // Get selected text directly using Accessibility API
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