#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#import <Vision/Vision.h>

static NSArray<NSValue *> *regionsForSize(CGSize s) {
  CGFloat w = s.width, h = s.height;
  return @[
    [NSValue valueWithRect:NSMakeRect(0, 0, w, h)],
    [NSValue valueWithRect:NSMakeRect(0, 0, w*0.5, h)],
    [NSValue valueWithRect:NSMakeRect(w*0.5, 0, w*0.5, h)],
    [NSValue valueWithRect:NSMakeRect(0, 0, w, h*0.5)],
    [NSValue valueWithRect:NSMakeRect(0, h*0.5, w, h*0.5)],
    [NSValue valueWithRect:NSMakeRect(w*0.1, h*0.1, w*0.8, h*0.8)]
  ];
}

static void decodeImage(CGImageRef cgImage, NSMutableSet<NSString *> *out) {
  if (!cgImage) return;
  VNDetectBarcodesRequest *request = [[VNDetectBarcodesRequest alloc] init];
  request.symbologies = @[VNBarcodeSymbologyQR];
  VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:cgImage options:@{}];
  NSError *error = nil;
  if (![handler performRequests:@[request] error:&error]) return;
  for (VNBarcodeObservation *obs in request.results) {
    NSString *p = obs.payloadStringValue;
    if (p.length > 0) [out addObject:p];
  }
}

int main(int argc, const char * argv[]) {
  @autoreleasepool {
    if (argc < 2) return 1;
    for (int i=1; i<argc; i++) {
      NSString *path = [NSString stringWithUTF8String:argv[i]];
      printf("FILE\t%s\n", path.UTF8String);
      NSImage *image = [[NSImage alloc] initWithContentsOfFile:path];
      if (!image) { printf("QR\t<unreadable>\n---\n"); continue; }
      CGRect rect = CGRectMake(0,0,image.size.width,image.size.height);
      CGImageRef base = [image CGImageForProposedRect:&rect context:nil hints:nil];
      if (!base) { printf("QR\t<no-cgimage>\n---\n"); continue; }

      NSMutableSet<NSString *> *found = [NSMutableSet set];
      decodeImage(base, found);

      CGSize s = CGSizeMake(CGImageGetWidth(base), CGImageGetHeight(base));
      for (NSValue *v in regionsForSize(s)) {
        CGRect r = [v rectValue];
        CGImageRef sub = CGImageCreateWithImageInRect(base, r);
        decodeImage(sub, found);
        if (sub) CGImageRelease(sub);
      }

      NSArray<NSString *> *sorted = [[found allObjects] sortedArrayUsingSelector:@selector(compare:)];
      if (sorted.count == 0) {
        printf("QR\t<none>\n");
      } else {
        for (NSString *p in sorted) printf("QR\t%s\n", p.UTF8String);
      }
      printf("---\n");
    }
  }
  return 0;
}
