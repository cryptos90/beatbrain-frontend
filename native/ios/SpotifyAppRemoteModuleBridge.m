#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SpotifyAppRemoteModule, NSObject)

RCT_EXTERN_METHOD(
  configure:(NSDictionary *)config
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  connect:(NSString *)accessToken
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  disconnect:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  playTrackUri:(NSString *)trackUri
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end
