import * as GoldenLayout from 'golden-layout';

import { OnInit, OnDestroy, AfterViewInit, ElementRef, Optional, Host, Injector, Directive, Input, Component, ContentChild, EmbeddedViewRef, TemplateRef, ViewContainerRef, SkipSelf, NgZone } from "@angular/core";
import { GoldenLayoutService } from "./golden-layout.service";


@Component({
    selector: 'golden-warper',
    template: `<ng-content #golden></ng-content>`,
    providers: [GoldenLayoutService]
})
export class GoldenLayoutComponent implements OnInit, OnDestroy, AfterViewInit {
    @Input() name: string;
    @Input() config: GoldenLayout.Config;

    constructor(
        private layoutSev: GoldenLayoutService,
        public ele: ElementRef,
        @SkipSelf() public parent: ElementRef,
        private zone: NgZone) {
    }

    ngOnInit(): void {
        console.log(`${this.constructor.name} ngOnInit`);

    }

    ngOnDestroy(): void {
        console.log(`${this.constructor.name} ngOnDestroy`);
    }

    ngAfterViewInit(): void {
        let that = this;
        this.zone.runOutsideAngular(() => {
            console.log(`${that.constructor.name} ngAfterViewInit`);
            let container = that.parent.nativeElement;
            let cnt = function (container3, state3) { that.createLayoutCompnent(container3, state3) };

            let style = getComputedStyle(container);

            that.config.content[0].content[0].width = that.getNumberFromStr(style.width);
            that.config.content[0].content[0].height = that.getNumberFromStr(style.height);
            that.layoutSev.config(that.name, that.config, container);
            that.layoutSev.register2({ 'name': that.name, 'constructor': cnt });
            that.layoutSev.init();
        });
    }

    createLayoutCompnent(container, state) {
        (<JQuery>container.getElement()).html(this.ele.nativeElement);
        setTimeout(() => {
            this.layoutSev.layout.updateSize();
        }, 10);
    }

    private getNumberFromStr(str: string): number | undefined {
        if (str.indexOf('px') === -1)
            return undefined;

        return +str.substr(0, str.indexOf('px'));
    }
}