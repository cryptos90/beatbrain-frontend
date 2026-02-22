import Foundation
import React
import SpotifyiOS

@objc(SpotifyAppRemoteModule)
class SpotifyAppRemoteModule: NSObject, SPTAppRemoteDelegate {
  private var appRemote: SPTAppRemote?
  private var pendingConnectResolve: RCTPromiseResolveBlock?
  private var pendingConnectReject: RCTPromiseRejectBlock?

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc(configure:resolver:rejecter:)
  func configure(
    _ config: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let clientId = String(describing: config["clientId"] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    let redirectUrlRaw = String(describing: config["redirectUrl"] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)

    guard !clientId.isEmpty else {
      reject("CONFIG_MISSING_CLIENT_ID", "Missing Spotify clientId.", nil)
      return
    }

    guard let redirectUrl = URL(string: redirectUrlRaw), !redirectUrlRaw.isEmpty else {
      reject("CONFIG_INVALID_REDIRECT_URL", "Missing or invalid Spotify redirectUrl.", nil)
      return
    }

    let configuration = SPTConfiguration(clientID: clientId, redirectURL: redirectUrl)
    let remote = SPTAppRemote(configuration: configuration, logLevel: .none)
    remote.delegate = self
    appRemote = remote

    resolve(nil)
  }

  @objc(connect:resolver:rejecter:)
  func connect(
    _ accessToken: String,
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let remote = appRemote else {
      reject("NOT_CONFIGURED", "Spotify App Remote not configured.", nil)
      return
    }

    let normalizedAccessToken = accessToken.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !normalizedAccessToken.isEmpty else {
      reject("MISSING_TOKEN", "Spotify access token missing for App Remote connect.", nil)
      return
    }

    remote.connectionParameters.accessToken = normalizedAccessToken

    if remote.isConnected {
      resolve(nil)
      return
    }

    pendingConnectResolve = resolve
    pendingConnectReject = reject
    remote.connect()
  }

  @objc(disconnect:rejecter:)
  func disconnect(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let remote = appRemote else {
      resolve(nil)
      return
    }

    if remote.isConnected {
      remote.disconnect()
    }

    resolve(nil)
  }

  @objc(playTrackUri:resolver:rejecter:)
  func playTrackUri(
    _ trackUri: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let normalizedUri = trackUri.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !normalizedUri.isEmpty else {
      reject("INVALID_URI", "Track URI is missing.", nil)
      return
    }

    guard let remote = appRemote else {
      reject("NOT_CONFIGURED", "Spotify App Remote not configured.", nil)
      return
    }

    guard remote.isConnected else {
      reject("NOT_CONNECTED", "Spotify App Remote not connected.", nil)
      return
    }

    remote.playerAPI?.play(normalizedUri, callback: { _, error in
      if let err = error {
        reject("PLAYBACK_FAILED", err.localizedDescription, err)
        return
      }
      resolve(nil)
    })
  }

  func appRemoteDidEstablishConnection(_ appRemote: SPTAppRemote) {
    pendingConnectResolve?(nil)
    pendingConnectResolve = nil
    pendingConnectReject = nil
  }

  func appRemote(_ appRemote: SPTAppRemote, didFailConnectionAttemptWithError error: Error?) {
    let err = error as NSError?
    pendingConnectReject?("CONNECT_FAILED", err?.localizedDescription ?? "Spotify connect failed.", err)
    pendingConnectResolve = nil
    pendingConnectReject = nil
  }

  func appRemote(_ appRemote: SPTAppRemote, didDisconnectWithError error: Error?) {
    if let reject = pendingConnectReject {
      let err = error as NSError?
      reject("DISCONNECTED", err?.localizedDescription ?? "Spotify disconnected.", err)
      pendingConnectResolve = nil
      pendingConnectReject = nil
    }
  }
}
