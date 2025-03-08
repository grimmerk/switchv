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
    
    // Using NSWorkspace to get the currently active application
    if let app = NSWorkspace.shared.frontmostApplication {
        print("DEBUG: Frontmost app: \(app.localizedName ?? "unknown"), PID: \(app.processIdentifier)")
        
        // For some applications we need special handling
        let appName = app.localizedName ?? ""
        
        // Special case for VS Code
        if appName.contains("Code") || appName.contains("Visual Studio Code") {
            print("DEBUG: VS Code detected, using special handling")
        }
        
        // Special case for Notion
        if appName == "Notion" {
            print("DEBUG: Notion detected, using special handling")
        }
        
        // Special case for Slack
        if appName == "Slack" {
            print("DEBUG: Slack detected, using special handling")
        }
        
        return (app.processIdentifier, appName)
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
    
    // Try to get the editor element
    var windows: AnyObject?
    let windowsResult = AXUIElementCopyAttributeValue(
        appElement,
        kAXWindowsAttribute as CFString,
        &windows
    )
    
    if windowsResult == .success, let windowArray = windows as? [AXUIElement] {
        for window in windowArray {
            // First try finding elements with specific roles that might contain editor
            let roles = ["AXTextArea", "AXTextField", "AXWebArea", "AXScrollArea", "AXGroup"]
            
            for role in roles {
                let result = findElementsByRole(window, role: role)
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
                    
                    // Try getting value
                    var value: AnyObject?
                    let valueResult = AXUIElementCopyAttributeValue(
                        element,
                        kAXValueAttribute as CFString,
                        &value
                    )
                    
                    if valueResult == .success, let fullText = value as? String, !fullText.isEmpty {
                        // For VS Code, sometimes the selection is in the value
                        // We might need to parse the value to find the selection
                        print("DEBUG: Found VS Code potential text content")
                        
                        // If we can't get the selection, but we're in a focused editor,
                        // we might want to consider returning the whole content for debugging
                        // return fullText
                    }
                }
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

// Main function
func main() {
    // Command line arguments handling
    let args = CommandLine.arguments
    var shouldPrompt = false
    
    // Parse arguments
    for i in 1..<args.count {
        if args[i] == "--prompt" {
            shouldPrompt = true
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