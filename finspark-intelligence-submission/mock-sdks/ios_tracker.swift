import Foundation
import CryptoKit

// -------------------------------------------------------------------------
// FinSpark Intelligence - iOS SDK Snippet (Mock)
// 
// Demonstrates how an iOS mobile app tracks features and securely hashes
// PII (like userId) locally before transmitting to the FinSpark backend.
// -------------------------------------------------------------------------

class FinSparkiOS {
    static let shared = FinSparkiOS()
    
    private let apiUrl = URL(string: "http://localhost:4000/api/events/batch")!
    private let tenantId = "tenant_c"
    private var eventQueue: [[String: Any]] = []
    
    private init() {}
    
    /// Hashes the user ID securely on the device so PII never hits the network
    private func maskUserId(_ rawUserId: String) -> String {
        let inputData = Data(rawUserId.utf8)
        let hashed = SHA256.hash(data: inputData)
        return hashed.compactMap { String(format: "%02x", $0) }.joined().prefix(16).description
    }
    
    func trackFeature(featureId: String, rawUserId: String, sessionId: String, outcome: String = "invoked") {
        let timestamp = ISO8601DateFormatter().string(from: Date())
        
        let event: [String: Any] = [
            "eventId": UUID().uuidString,
            "tenantId": tenantId,
            "featureId": featureId,
            "channel": "mobile", // Identifies this traffic as coming from iOS/Mobile
            "userId": maskUserId(rawUserId),
            "sessionId": sessionId,
            "outcome": outcome,
            "timestamp": timestamp,
            "meta": "{\"os\":\"iOS 17.2\", \"device\":\"iPhone 15 Pro\"}"
        ]
        
        eventQueue.append(event)
        
        // In a real SDK, we'd flush on backgrounding or timer.
        if eventQueue.count >= 20 {
            flush()
        }
    }
    
    func flush() {
        guard !eventQueue.isEmpty else { return }
        
        let payload: [String: Any] = ["events": eventQueue]
        guard let jsonData = try? JSONSerialization.data(withJSONObject: payload) else { return }
        
        var request = URLRequest(url: apiUrl)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = jsonData
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                print("FinSpark: Successfully synced \(self.eventQueue.count) events.")
                self.eventQueue.removeAll()
            } else {
                print("FinSpark: Failed to sync events. Will retry later.")
            }
        }
        task.resume()
    }
}

// --- Example Usage ---
/*
 FinSparkiOS.shared.trackFeature(
     featureId: "kyc.video-kyc",
     rawUserId: "john.doe@example.com",
     sessionId: "sess_xyz789",
     outcome: "completed"
 )
 FinSparkiOS.shared.flush()
*/
