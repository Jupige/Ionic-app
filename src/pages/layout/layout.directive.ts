import * as GoldenLayout from 'golden-layout';
import { Directive, Input, OnInit, OnDestroy, AfterViewInit, ElementRef, Host, Optional, ComponentFactoryResolver, ViewContainerRef, HostListener, Type, Component } from "@angular/core";
import { GoldenLayoutService } from "../../app/golden-layout.service";
import { ItemConfigType, ContentItem } from "golden-layout";


@Component({
    selector: 'golden',
    template: '',
    providers: [GoldenLayoutService]
})
export class GoldenLayoutDirective implements OnInit, OnDestroy, AfterViewInit {

    @Input() name: string;
    @Input() config: GoldenLayout.Config;
    @Input() componentTypes: any[];
    private _container: any;

    constructor(
        private viewContainer: ViewContainerRef,
        private componentFactoryResolver: ComponentFactoryResolver,
        private layoutSev: GoldenLayoutService) {

    }

    get container(): any {
        if (!!this._container)
            return this._container;

        if (!this.viewContainer) {
            this._container = document.body;
        } else {
            this._container = this.viewContainer.element.nativeElement;
        }

        return this._container;
    }

    ngOnInit(): void {

    }

    ngOnDestroy(): void {

    }

    ngAfterViewInit(): void {
        debugger;
        let that = this;
        this.layoutSev.config(this.name, this.config, this.container);

        for (var i = this.componentTypes.length - 1; i >= 0; i--) {
            let item = this.componentTypes[i];
            let cnt = function (container3, state3) {
                that.createLayoutCompnent(container3, state3, item.type)
            };
            this.layoutSev.register2({ name: item.name, constructor: cnt });
        }

        this.layoutSev.init();

        setTimeout(() => {
            this.addChild({
                title: 'example',
                type: 'component',
                componentName: 'UserListPage3',
            });
        }, 6000);
    }

    createLayoutCompnent(container, state, componentType: Type<any>) {
        let factory = this.componentFactoryResolver.resolveComponentFactory(componentType);

        let compRef = this.viewContainer.createComponent(factory);
        if (compRef.instance.glOnInit) {
            compRef.instance.glOnInit(state);
        }
        container.getElement().append(compRef.location.nativeElement);
        compRef.changeDetectorRef.detectChanges();
    }


    @HostListener('window:resize', ['$event'])
    onResize(event) {
        this.layoutSev.updateSize();
    }

    addItem(config: GoldenLayout.ItemConfigType) {
        this.layoutSev.addItem(this.container, config);
    }

    addChild(config: ContentItem | ItemConfigType) {
        this.layoutSev.addChild(config);
    }
}